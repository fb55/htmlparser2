module.exports = Parser;

var i = 0,

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
    CDATA_END_2 = i++, // ]

    //special tags
    SPECIAL_START = i++, //S
    SPECIAL_END = i++,   //S

    SCRIPT_1 = i++, //C
    SCRIPT_2 = i++, //R
    SCRIPT_3 = i++, //I
    SCRIPT_4 = i++, //P
    SCRIPT_5 = i++, //T
    SCRIPT_END_1 = i++, //C
    SCRIPT_END_2 = i++, //R
    SCRIPT_END_3 = i++, //I
    SCRIPT_END_4 = i++, //P
    SCRIPT_END_5 = i++, //T

    STYLE_1 = i++, //T
    STYLE_2 = i++, //Y
    STYLE_3 = i++, //L
    STYLE_4 = i++, //E
    STYLE_END_1 = i++, //T
    STYLE_END_2 = i++, //Y
    STYLE_END_3 = i++, //L
    STYLE_END_4 = i++; //E

function code(c){
	return c.charCodeAt(0);
}

function whitespace(c){
	return c === code(" ") || c === code("\t") || c === code("\r") || c === code("\n");
}

function Parser(options, cbs){
	this._state = TEXT;
	this._buffer = null;
	this._sectionStart = 0;
	this._index = 0;
	this._options = options;
	this._special = 0; // 1 for script, 2 for style
	this._cbs = cbs;
	this._running = true;
}

Parser.prototype.write = function(chunk){
	if(typeof chunk === "string") chunk = new Buffer(chunk);
	else if(!Buffer.isBuffer(chunk)) throw new Error("chunks must be buffers or string!");

	if(this._buffer === null) this._buffer = chunk;
	else this._buffer = Buffer.concat([this._buffer, chunk]);

	this._processData();
};

//TODO make events conditional

Parser.prototype._processData = function(){
	while(this._index < this._buffer.length && this._running){
		var c = this._buffer[this._index];
		if(this._state === TEXT){
			if(c === code("<")){
				this._emitIfToken("text");
				this._state = TAG_START;
				this._sectionStart = this._index;
			}
		} else if(this._state === TAG_START){
			if(c === code("/")){
				this._state = CLOSING_TAG_START;
			} else if(c === code(">") || this._special > 0) {
				this._state = TEXT;
			} else {
				if(whitespace(c));
				else if(c === code("!")){
					this._state = DECLARATION_START;
					this._sectionStart = this._index + 1;
				} else if(c === code("?")){
					this._state = IN_PROCESSING_INSTRUCTION;
					this._sectionStart = this._index + 1;
				} else if(
					(!this._options || !this._options.xmlMode) &&
					(c === code("s") || c === code("S"))
				){
					this._state = SPECIAL_START;
					this._sectionStart = this._index;
				} else {
					this._state = IN_TAG_NAME;
					this._sectionStart = this._index;
				}
			}
		} else if(this._state === IN_TAG_NAME){
			if(c === code("/")){
				this._emitToken("opentagname");
				this._cbs.onopentagend();
				this._cbs.onselfclosingtag();
				this._state = AFTER_CLOSING_TAG_NAME;
			} else if(c === code(">")){
				this._emitToken("opentagname");
				this._cbs.onopentagend();
				this._state = TEXT;
				this._sectionStart = this._index + 1;
			} else if(whitespace(c)){
				this._emitToken("opentagname");
				this._state = BEFORE_ATTRIBUTE_NAME;
			}
		} else if(this._state === CLOSING_TAG_START){
			if(whitespace(c));
			else if(c === code(">")){
				this._state = TEXT;
			} else if(this._special > 0){
				if(c === code("s") || c === code("S")){
					this._state = SPECIAL_END;
				}
			} else {
				this._state = IN_CLOSING_TAG_NAME;
				this._sectionStart = this._index;
			}
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
				this._cbs.onopentagend();
				this._cbs.onselfclosingtag();
				this._state = AFTER_CLOSING_TAG_NAME;
			} else if(c === code(">")){
				this._state = TEXT;
				this._cbs.onopentagend();
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
				this._cbs.onopentagend();
				this._cbs.onselfclosingtag();
				this._state = AFTER_CLOSING_TAG_NAME;
			} else if(c === code(">")){
				this._emitIfToken("attribname");
				this._state = TEXT;
				this._cbs.onopentagend();
				this._sectionStart = this._index + 1;
			} else if(whitespace(c)){
				this._emitIfToken("attribname");
				this._state = AFTER_ATTRIBUTE_NAME;
			}
		} else if(this._state === AFTER_ATTRIBUTE_NAME){
			if(c === code("=")){
				this._state = BEFORE_ATTRIBUTE_VALUE;
			} else if(c === code("/")){
				this._cbs.onopentagend();
				this._cbs.onselfclosingtag();
				this._state = AFTER_CLOSING_TAG_NAME;
			} else if(c === code(">")){
				this._state = TEXT;
				this._cbs.onopentagend();
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
			if(c === code(">")){
				this._emitToken("attribvalue");
				this._state = TEXT;
				this._cbs.onopentagend();
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
				this._cbs.oncomment(this._buffer.toString("utf8", this._sectionStart, this._index - 2));
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
				this._cbs.oncdata(this._buffer.toString("utf8", this._sectionStart, this._index - 2));
				this._state = TEXT;
				this._sectionStart = this._index + 1;
			} else {
				this._state = IN_CDATA;
			}
		}

		/*
		* special tags
		*/
		else if(this._state === SPECIAL_START){
			if(c === code("c") || c === code("C")){
				this._state = SCRIPT_1;
			} else if(c === code("t") || c === code("T")){
				this._state = STYLE_1;
			} else {
				this._state = IN_TAG_NAME;
				this._index--; //consume the token again
			}
		} else if(this._state === SPECIAL_END){
			if(this._special === 1 && (c === code("c") || c === code("C"))){
				this._state = SCRIPT_END_1;
			} else if(this._special === 2 && (c === code("t") || c === code("T"))){
				this._state = STYLE_END_1;
			} 
			else this._state = TEXT;
		}

		/*
		* script
		*/
		else if(this._state === SCRIPT_1){
			if(c === code("r") || c === code("R")){
				this._state = SCRIPT_2;
			} else {
				this._state = IN_TAG_NAME;
				this._index--; //consume the token again
			}
		} else if(this._state === SCRIPT_2){
			if(c === code("i") || c === code("I")){
				this._state = SCRIPT_3;
			} else {
				this._state = IN_TAG_NAME;
				this._index--; //consume the token again
			}
		} else if(this._state === SCRIPT_3){
			if(c === code("p") || c === code("P")){
				this._state = SCRIPT_4;
			} else {
				this._state = IN_TAG_NAME;
				this._index--; //consume the token again
			}
		} else if(this._state === SCRIPT_4){
			if(c === code("t") || c === code("T")){
				this._state = SCRIPT_5;
			} else {
				this._state = IN_TAG_NAME;
				this._index--; //consume the token again
			}
		} else if(this._state === SCRIPT_5){
			if(c === code("/") || c === code(">") || whitespace(c)){
				this._special = 1;
			}
			this._state = IN_TAG_NAME;
			this._index--; //consume the token again
		}

		else if(this._state === SCRIPT_END_1){
			if(c === code("r") || c === code("R")){
				this._state = SCRIPT_END_2;
			} 
			else this._state = TEXT;
		} else if(this._state === SCRIPT_END_2){
			if(c === code("i") || c === code("I")){
				this._state = SCRIPT_END_3;
			} 
			else this._state = TEXT;
		} else if(this._state === SCRIPT_END_3){
			if(c === code("p") || c === code("P")){
				this._state = SCRIPT_END_4;
			} 
			else this._state = TEXT;
		} else if(this._state === SCRIPT_END_4){
			if(c === code("t") || c === code("T")){
				this._state = SCRIPT_END_5;
			} 
			else this._state = TEXT;
		} else if(this._state === SCRIPT_END_5){
			if(c === code(">") || whitespace(c)){
				this._state = IN_CLOSING_TAG_NAME;
				this._sectionStart = this._index - 6;
				this._index--; //reconsume the token
			} 
			else this._state = TEXT;
		}

		/*
		* style
		*/
		else if(this._state === STYLE_1){
			if(c === code("y") || c === code("Y")){
				this._state = STYLE_2;
			} else {
				this._state = IN_TAG_NAME;
				this._index--; //consume the token again
			}
		} else if(this._state === STYLE_2){
			if(c === code("l") || c === code("L")){
				this._state = STYLE_3;
			} else {
				this._state = IN_TAG_NAME;
				this._index--; //consume the token again
			}
		} else if(this._state === STYLE_3){
			if(c === code("e") || c === code("E")){
				this._state = STYLE_4;
			} else {
				this._state = IN_TAG_NAME;
				this._index--; //consume the token again
			}
		} else if(this._state === STYLE_4){
			if(c === code("/") || c === code(">") || whitespace(c)){
				this._special = 2;
			}
			this._state = IN_TAG_NAME;
			this._index--; //consume the token again
		}

		else if(this._state === STYLE_END_1){
			if(c === code("y") || c === code("Y")){
				this._state = STYLE_END_2;
			} 
			else this._state = TEXT;
		} else if(this._state === STYLE_END_2){
			if(c === code("l") || c === code("L")){
				this._state = STYLE_END_3;
			} 
			else this._state = TEXT;
		} else if(this._state === STYLE_END_3){
			if(c === code("e") || c === code("E")){
				this._state = STYLE_END_4;
			} 
			else this._state = TEXT;
		} else if(this._state === STYLE_END_4){
			if(c === code(">") || whitespace(c)){
				this._state = IN_CLOSING_TAG_NAME;
				this._sectionStart = this._index - 5;
				this._index--; //reconsume the token
			} 
			else this._state = TEXT;
		}


		else {
			this._cbs.onerror(Error("unknown state"), this._state);
		}

		this._index++;
	}

	//cleanup
	if(this._sectionStart === -1){
		this._buffer = null;
		this._index = 0;
	} else {
		if(this._state === TEXT){
			this._emitIfToken("text");
			this._buffer = null;
			this._index = 0;
		} else if(this._sectionStart === this._index){
			//the section just started
			this._buffer = null;
			this._index = 0;
		} else if(this._sectionStart > 0){
			//remove everything unnecessary
			this._buffer = this._buffer.slice(this._sectionStart);
			this._index -= this._sectionStart;
		}

		this._sectionStart = 0;
	}
};

Parser.prototype.pause = function(){
	this._running = false;
};
Parser.prototype.resume = function(){
	this._running = true;
};

Parser.prototype.end = function(chunk){
	if(chunk) this.write(chunk);

	//if there is remaining data, emit it in a reasonable way
	if(this._buffer === null || this._sectionStart === -1 || this._sectionStart === this._index - 1);
	else if(this._state === IN_CDATA || this._state === CDATA_END_1 || this._state === CDATA_END_2){
		this._emitIfToken("cdata");
	} else if(this._state === IN_COMMENT || this._state === COMMENT_END_1 || this._state === COMMENT_END_2){
		this._emitIfToken("comment");
	} else if(this._state === IN_TAG_NAME){
		this._emitIfToken("opentagname");
	} else if(this._state === IN_CLOSING_TAG_NAME){
		this._emitIfToken("closetag");
	} else {
		this._emitIfToken("text");
	}

	this._cbs.onend();
};

Parser.prototype._emitToken = function(name){
	this._cbs["on" + name](this._buffer.toString("utf8", this._sectionStart, this._index));
	this._sectionStart = -1;
};

Parser.prototype._emitIfToken = function(name){
	if(this._index > this._sectionStart){
		this._cbs["on" + name](this._buffer.toString("utf8", this._sectionStart, this._index));
	}
	this._sectionStart = -1;
};