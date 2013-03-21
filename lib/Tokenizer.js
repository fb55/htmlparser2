module.exports = Parser;

var WritableStream = require("stream").Writable,

    i = 0,

    TEXT = i++,
    TAG_START = i++, //after <
    IN_TAG_NAME = i++,
    CLOSING_TAG_START = i++,
    IN_CLOSING_TAG_NAME = i++,
    AFTER_CLOSING_TAG_NAME = i++,

    //attributes
    BEFORE_ATTRIBUTE_NAME = i++,
    IN_ATTRIBUTE_NAME = i++,
    AFTER_ATTRIBUTE_NAME = i++,
    BEFORE_ATTRIBUTE_VALUE = i++,
    IN_ATTRIBUTE_VALUE_DOUBLE_QUOTES = i++, // "
    IN_ATTRIBUTE_VALUE_SINGLE_QUOTES = i++, // '
    IN_ATTRIBUTE_VALUE_NO_QUOTES = i++,

    //declarations
    DECLARATION_START = i++, // !
    IN_DECLARATION = i++,

    //processing instructions
    IN_PROCESSING_INSTRUCTION = i++, // ?

    //comments
    BEFORE_COMMENT = i++,
    IN_COMMENT = i++,
    COMMENT_END_1 = i++,
    COMMENT_END_2 = i++,

    //cdata
    CDATA_1 = i++, // [
    CDATA_2 = i++, // C
    CDATA_3 = i++, // D
    CDATA_4 = i++, // A
    CDATA_5 = i++, // T
    CDATA_6 = i++, // A
    IN_CDATA = i++,// [
    CDATA_END_1 = i++, // ]
    CDATA_END_2 = i++; // ]

    //TODO add logic to handle special tags

function code(c){
	return c.charCodeAt(0);
}

function whitespace(c){
	return c === code(" ") || c === code("\t") || c === code("\r") || c === code("\n");
}

function Parser(options){
	this._state = TEXT;
	this._buffer = null;
	this._sectionStart = 0;
	this._index = 0;
	this._options = options;

	WritableStream.call(this, options);
}

require("util").inherits(Parser, WritableStream);

Parser.prototype._write = function(chunk, encoding, cb){
	if(this._buffer === null) this._buffer = chunk;
	else this._buffer = Buffer.concat([this._buffer, chunk]);

	while(this._index < this._buffer.length){
		var c = this._buffer[this._index];
		if(this._state === TEXT){
			if(c === code("<")){
				this._emitIfToken("text");
				this._state = TAG_START;
			}
		} else if(this._state === TAG_START){
			if(c === code("!")){
				this._state = DECLARATION_START;
				this._sectionStart = this._index + 1;
			} else if(c === code("?")){
				this._state = IN_PROCESSING_INSTRUCTION;
				this._sectionStart = this._index + 1;
			} else if(c === code("/")){
				this._state = CLOSING_TAG_START;
			} else if(!whitespace(c)){
				this._state = IN_TAG_NAME;
				this._sectionStart = this._index;
			}
			//TODO handle ">"
		} else if(this._state === IN_TAG_NAME){
			if(c === code("/")){
				this._emitToken("opentagname");
				this.emit("selfclosingtag");
				this._state = AFTER_CLOSING_TAG_NAME;
			} else if(c === code(">")){
				this._emitToken("opentagname");
				this._state = TEXT;
				this._sectionStart = this._index + 1;
			} else if(whitespace(c)){
				this._emitToken("opentagname");
				this._state = BEFORE_ATTRIBUTE_NAME;
			}
		} else if(this._state === CLOSING_TAG_START){
			if(!whitespace(c)){
				this._state = IN_CLOSING_TAG_NAME;
				this._sectionStart = this._index;
			}
			// TODO handle ">"
		} else if(this._state === IN_CLOSING_TAG_NAME){
			if(c === code(">")){
				this._emitToken("closetag");
				this._state = TEXT;
				this._sectionStart = this._index + 1;
			} else if(whitespace(c)){
				this._emitToken("closetag");
				this._state = AFTER_CLOSING_TAG_NAME;
			}
		} else if(this._state === AFTER_CLOSING_TAG_NAME){
			//skip everything until ">"
			if(c === code(">")){
				this._state = TEXT;
				this._sectionStart = this._index + 1;
			}
		}

		/*
		*	attributes
		*/
		else if(this._state === BEFORE_ATTRIBUTE_NAME){
			if(c === code("/")){
				this.emit("selfclosingtag");
				this._state = AFTER_CLOSING_TAG_NAME;
			} else if(c === code(">")){
				this._state = TEXT;
				this._sectionStart = this._index + 1;
			} else if(!whitespace(c)){
				this._state = IN_ATTRIBUTE_NAME;
				this._sectionStart = this._index;
			}
		} else if(this._state === IN_ATTRIBUTE_NAME){
			if(c === code("=")){
				this._emitIfToken("attribname");
				this._state = BEFORE_ATTRIBUTE_VALUE;
			} else if(c === code("/")){
				this._emitIfToken("attribname");
				this.emit("selfclosingtag");
				this._state = AFTER_CLOSING_TAG_NAME;
			} else if(c === code(">")){
				this._emitIfToken("attribname");
				this._state = TEXT;
				this._sectionStart = this._index + 1;
			} else if(whitespace(c)){
				this._emitIfToken("attribname");
				this._state = AFTER_ATTRIBUTE_NAME;
			}
		} else if(this._state === AFTER_ATTRIBUTE_NAME){
			if(c === code("=")){
				this._state = BEFORE_ATTRIBUTE_VALUE;
			} else if(c === code("/")){
				this.emit("selfclosingtag");
				this._state = AFTER_CLOSING_TAG_NAME;
			} else if(c === code(">")){
				this._state = TEXT;
				this._sectionStart = this._index + 1;
			} else if(!whitespace(c)){
				this._state = IN_ATTRIBUTE_NAME;
				this._sectionStart = this._index;
			}
		} else if(this._state === BEFORE_ATTRIBUTE_VALUE){
			if(c === code("\"")){
				this._state = IN_ATTRIBUTE_VALUE_DOUBLE_QUOTES;
				this._sectionStart = this._index + 1;
			} else if(c === code("'")){
				this._state = IN_ATTRIBUTE_VALUE_SINGLE_QUOTES;
				this._sectionStart = this._index + 1;
			} else if(!whitespace(c)){
				this._state = IN_ATTRIBUTE_VALUE_NO_QUOTES;
				this._sectionStart = this._index;
			}
		} else if(this._state === IN_ATTRIBUTE_VALUE_DOUBLE_QUOTES){
			if(c === code("\"")){
				this._emitToken("attribvalue");
				this._state = BEFORE_ATTRIBUTE_NAME;
			}
		} else if(this._state === IN_ATTRIBUTE_VALUE_SINGLE_QUOTES){
			if(c === code("'")){
				this._emitToken("attribvalue");
				this._state = BEFORE_ATTRIBUTE_NAME;	
			}
		} else if(this._state === IN_ATTRIBUTE_VALUE_NO_QUOTES){
			if(c === code("/")){
				this._emitToken("attribvalue");
				this.emit("selfclosingtag");
				this._state = AFTER_CLOSING_TAG_NAME;
			} else if(c === code(">")){
				this._emitToken("attribvalue");
				this._state = TEXT;
				this._sectionStart = this._index + 1;
			} else if(whitespace(c)){
				this._emitToken("attribvalue");
				this._state = BEFORE_ATTRIBUTE_NAME;
			}
		}

		/*
		*	declarations
		*/
		else if(this._state === DECLARATION_START){
			if(c === code("[")) this._state = CDATA_1;
			else if(c === code("-")) this._state = BEFORE_COMMENT;
			else this._state = IN_DECLARATION;
		} else if(this._state === IN_DECLARATION){
			if(c === code(">")){
				this._emitToken("declaration");
				this._state = TEXT;
				this._sectionStart = this._index + 1;
			}
		}

		/*
		*	processing instructions
		*/
		else if(this._state === IN_PROCESSING_INSTRUCTION){
			if(c === code(">")){
				this._emitToken("processinginstruction");
				this._state = TEXT;
				this._sectionStart = this._index + 1;
			}
		}

		/*
		*	comments
		*/
		else if(this._state === BEFORE_COMMENT){
			if(c === code("-")){
				this._state = IN_COMMENT;
				this._sectionStart = this._index + 1;
			} else {
				this._state = IN_DECLARATION;
			}
		} else if(this._state === IN_COMMENT){
			if(c === code("-")) this._state = COMMENT_END_1;
		} else if(this._state === COMMENT_END_1){
			if(c === code("-")) this._state = COMMENT_END_2;
			else this._state = IN_COMMENT;
		} else if(this._state === COMMENT_END_2){
			if(c === code(">")){
				//remove 2 trailing chars
				this.emit("comment", this._buffer.toString("utf8", this._sectionStart, this._index - 2));
				this._state = TEXT;
				this._sectionStart = this._index + 1;
			} else {
				this._state = IN_COMMENT;
			}
		}

		/*
		*	cdata
		*/
		else if(this._state === CDATA_1){
			if(c === code("C")) this._state = CDATA_2;
			else this._state = IN_DECLARATION;
		} else if(this._state === CDATA_2){
			if(c === code("D")) this._state = CDATA_3;
			else this._state = IN_DECLARATION;
		} else if(this._state === CDATA_3){
			if(c === code("A")) this._state = CDATA_4;
			else this._state = IN_DECLARATION;
		} else if(this._state === CDATA_4){
			if(c === code("T")) this._state = CDATA_5;
			else this._state = IN_DECLARATION;
		} else if(this._state === CDATA_5){
			if(c === code("A")) this._state = CDATA_6;
			else this._state = IN_DECLARATION;
		} else if(this._state === CDATA_6){
			if(c === code("[")){
				this._state = IN_CDATA;
				this._sectionStart = this._index + 1;
			} else {
				this._state = IN_DECLARATION;
			}
		} else if(this._state === IN_CDATA){
			if(c === code("]")) this._state = CDATA_END_1;
		} else if(this._state === CDATA_END_1){
			if(c === code("]")) this._state = CDATA_END_2;
			else this._state = IN_CDATA;
		} else if(this._state === CDATA_END_2){
			if(c === code(">")){
				//remove 2 trailing chars
				this.emit("cdata", this._buffer.toString("utf8", this._sectionStart, this._index - 2));
				this._state = TEXT;
				this._sectionStart = this._index + 1;
			} else {
				this._state = IN_CDATA;
			}
		} else {
			throw Error("unknown state " + this._state);
		}

		this._index++;
	}

	//cleanup
	if(this._sectionStart === -1){
		this._buffer = null;
	} else {
		this._sectionStart = 0;

		if(this._sectionStart === this._index - 1){
			this._buffer = null;
		} else {
			this._buffer = this._buffer.slice(this._sectionStart);
		}
	}

	cb();
};

Parser.prototype._emitToken = function(name){
	this.emit(name, this._buffer.toString("utf8", this._sectionStart, this._index));
	this._sectionStart = -1;
};

Parser.prototype._emitIfToken = function(name){
	if(this._index > this._sectionStart){
		this.emit(name, this._buffer.toString("utf8", this._sectionStart, this._index));
	}
	this._sectionStart = -1;
};

/*
//overwritten for better debuggability
Parser.prototype.emit = function(){
	process.stdout.write("[" + this._state + "]\t");
	console.log.apply(null, [].map.call(arguments, Function.prototype.call, String.prototype.trim));
	WritableStream.prototype.emit.apply(this, arguments);
};

Parser.prototype.end = function(){
	WritableStream.prototype.end.apply(this, arguments);

	if(this._state === TEXT) return;
	console.log("the game must go on!", this._state);
};
*/