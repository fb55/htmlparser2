module.exports = Tokenizer;

var i = 0,

    TEXT = i++,
    BEFORE_TAG_NAME = i++, //after <
    IN_TAG_NAME = i++,
    BEFORE_CLOSING_TAG_NAME = i++,
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
    BEFORE_DECLARATION = i++, // !
    IN_DECLARATION = i++,

    //processing instructions
    IN_PROCESSING_INSTRUCTION = i++, // ?

    //comments
    BEFORE_COMMENT = i++,
    IN_COMMENT = i++,
    AFTER_COMMENT_1 = i++,
    AFTER_COMMENT_2 = i++,

    //cdata
    BEFORE_CDATA_1 = i++, // [
    BEFORE_CDATA_2 = i++, // C
    BEFORE_CDATA_3 = i++, // D
    BEFORE_CDATA_4 = i++, // A
    BEFORE_CDATA_5 = i++, // T
    BEFORE_CDATA_6 = i++, // A
    IN_CDATA = i++,// [
    AFTER_CDATA_1 = i++, // ]
    AFTER_CDATA_2 = i++, // ]

    //special tags
    BEFORE_SPECIAL = i++, //S
    BEFORE_SPECIAL_END = i++,   //S

    BEFORE_SCRIPT_1 = i++, //C
    BEFORE_SCRIPT_2 = i++, //R
    BEFORE_SCRIPT_3 = i++, //I
    BEFORE_SCRIPT_4 = i++, //P
    BEFORE_SCRIPT_5 = i++, //T
    AFTER_SCRIPT_1 = i++, //C
    AFTER_SCRIPT_2 = i++, //R
    AFTER_SCRIPT_3 = i++, //I
    AFTER_SCRIPT_4 = i++, //P
    AFTER_SCRIPT_5 = i++, //T

    BEFORE_STYLE_1 = i++, //T
    BEFORE_STYLE_2 = i++, //Y
    BEFORE_STYLE_3 = i++, //L
    BEFORE_STYLE_4 = i++, //E
    AFTER_STYLE_1 = i++, //T
    AFTER_STYLE_2 = i++, //Y
    AFTER_STYLE_3 = i++, //L
    AFTER_STYLE_4 = i++; //E


function whitespace(c){
	return c === " " || c === "\t" || c === "\r" || c === "\n";
}

function Tokenizer(options, cbs){
	this._state = TEXT;
	this._buffer = "";
	this._sectionStart = 0;
	this._index = 0;
	this._options = options;
	this._special = 0; // 1 for script, 2 for style
	this._cbs = cbs;
	this._running = true;
}

//TODO make events conditional
Tokenizer.prototype.write = function(chunk){
	this._buffer += chunk;

	while(this._index < this._buffer.length && this._running){
		var c = this._buffer.charAt(this._index);
		if(this._state === TEXT){
			if(c === "<"){
				this._emitIfToken("ontext");
				this._state = BEFORE_TAG_NAME;
				this._sectionStart = this._index;
			}
		} else if(this._state === BEFORE_TAG_NAME){
			if(c === "/"){
				this._state = BEFORE_CLOSING_TAG_NAME;
			} else if(c === ">" || this._special > 0) {
				this._state = TEXT;
			} else {
				if(whitespace(c));
				else if(c === "!"){
					this._state = BEFORE_DECLARATION;
					this._sectionStart = this._index + 1;
				} else if(c === "?"){
					this._state = IN_PROCESSING_INSTRUCTION;
					this._sectionStart = this._index + 1;
				} else if(
					(!this._options || !this._options.xmlMode) &&
					(c === "s" || c === "S")
				){
					this._state = BEFORE_SPECIAL;
					this._sectionStart = this._index;
				} else {
					this._state = IN_TAG_NAME;
					this._sectionStart = this._index;
				}
			}
		} else if(this._state === IN_TAG_NAME){
			if(c === "/"){
				this._emitToken("onopentagname");
				this._cbs.onselfclosingtag();
				this._state = AFTER_CLOSING_TAG_NAME;
			} else if(c === ">"){
				this._emitToken("onopentagname");
				this._cbs.onopentagend();
				this._state = TEXT;
				this._sectionStart = this._index + 1;
			} else if(whitespace(c)){
				this._emitToken("onopentagname");
				this._state = BEFORE_ATTRIBUTE_NAME;
			}
		} else if(this._state === BEFORE_CLOSING_TAG_NAME){
			if(whitespace(c));
			else if(c === ">"){
				this._state = TEXT;
			} else if(this._special > 0){
				if(c === "s" || c === "S"){
					this._state = BEFORE_SPECIAL_END;
				} else {
					this._state = TEXT;
					this._index--;
				}
			} else {
				this._state = IN_CLOSING_TAG_NAME;
				this._sectionStart = this._index;
			}
		} else if(this._state === IN_CLOSING_TAG_NAME){
			if(c === ">"){
				this._emitToken("onclosetag");
				this._state = TEXT;
				this._sectionStart = this._index + 1;
				this._special = 0;
			} else if(whitespace(c)){
				this._emitToken("onclosetag");
				this._state = AFTER_CLOSING_TAG_NAME;
				this._special = 0;
			}
		} else if(this._state === AFTER_CLOSING_TAG_NAME){
			//skip everything until ">"
			if(c === ">"){
				this._state = TEXT;
				this._sectionStart = this._index + 1;
			}
		}

		/*
		*	attributes
		*/
		else if(this._state === BEFORE_ATTRIBUTE_NAME){
			if(c === ">"){
				this._state = TEXT;
				this._cbs.onopentagend();
				this._sectionStart = this._index + 1;
			} else if(c === "/"){
				this._cbs.onselfclosingtag();
				this._state = AFTER_CLOSING_TAG_NAME;
			} else if(!whitespace(c)){
				this._state = IN_ATTRIBUTE_NAME;
				this._sectionStart = this._index;
			}
		} else if(this._state === IN_ATTRIBUTE_NAME){
			if(c === "="){
				this._emitIfToken("onattribname");
				this._state = BEFORE_ATTRIBUTE_VALUE;
			} else if(whitespace(c)){
				this._emitIfToken("onattribname");
				this._state = AFTER_ATTRIBUTE_NAME;
			} else if(c === "/" || c === ">"){
				this._emitIfToken("onattribname");
				this._state = BEFORE_ATTRIBUTE_NAME;
				this._index--;
			}
		} else if(this._state === AFTER_ATTRIBUTE_NAME){
			if(c === "="){
				this._state = BEFORE_ATTRIBUTE_VALUE;
			} else if(c === "/" || c === ">"){
				this._state = BEFORE_ATTRIBUTE_NAME;
				this._index--;
			} else if(!whitespace(c)){
				this._state = IN_ATTRIBUTE_NAME;
				this._sectionStart = this._index;
			}
		} else if(this._state === BEFORE_ATTRIBUTE_VALUE){
			if(c === "\""){
				this._state = IN_ATTRIBUTE_VALUE_DOUBLE_QUOTES;
				this._sectionStart = this._index + 1;
			} else if(c === "'"){
				this._state = IN_ATTRIBUTE_VALUE_SINGLE_QUOTES;
				this._sectionStart = this._index + 1;
			} else if(!whitespace(c)){
				this._state = IN_ATTRIBUTE_VALUE_NO_QUOTES;
				this._sectionStart = this._index;
			}
		} else if(this._state === IN_ATTRIBUTE_VALUE_DOUBLE_QUOTES){
			if(c === "\""){
				this._emitToken("onattribvalue");
				this._state = BEFORE_ATTRIBUTE_NAME;
			}
		} else if(this._state === IN_ATTRIBUTE_VALUE_SINGLE_QUOTES){
			if(c === "'"){
				this._state = BEFORE_ATTRIBUTE_NAME;	
				this._emitToken("onattribvalue");
			}
		} else if(this._state === IN_ATTRIBUTE_VALUE_NO_QUOTES){
			if(c === ">"){
				this._emitToken("onattribvalue");
				this._state = TEXT;
				this._cbs.onopentagend();
				this._sectionStart = this._index + 1;
			} else if(whitespace(c)){
				this._emitToken("onattribvalue");
				this._state = BEFORE_ATTRIBUTE_NAME;
			}
		}

		/*
		*	declarations
		*/
		else if(this._state === BEFORE_DECLARATION){
			if(c === "[") this._state = BEFORE_CDATA_1;
			else if(c === "-") this._state = BEFORE_COMMENT;
			else this._state = IN_DECLARATION;
		} else if(this._state === IN_DECLARATION){
			if(c === ">"){
				this._emitToken("ondeclaration");
				this._state = TEXT;
				this._sectionStart = this._index + 1;
			}
		}

		/*
		*	processing instructions
		*/
		else if(this._state === IN_PROCESSING_INSTRUCTION){
			if(c === ">"){
				this._emitToken("onprocessinginstruction");
				this._state = TEXT;
				this._sectionStart = this._index + 1;
			}
		}

		/*
		*	comments
		*/
		else if(this._state === BEFORE_COMMENT){
			if(c === "-"){
				this._state = IN_COMMENT;
				this._sectionStart = this._index + 1;
			} else {
				this._state = IN_DECLARATION;
			}
		} else if(this._state === IN_COMMENT){
			if(c === "-") this._state = AFTER_COMMENT_1;
		} else if(this._state === AFTER_COMMENT_1){
			if(c === "-") this._state = AFTER_COMMENT_2;
			else this._state = IN_COMMENT;
		} else if(this._state === AFTER_COMMENT_2){
			if(c === ">"){
				//remove 2 trailing chars
				this._cbs.oncomment(this._buffer.substring(this._sectionStart, this._index - 2));
				this._state = TEXT;
				this._sectionStart = this._index + 1;
			} else if (c === '-') {
				// Keep the state at AFTER_COMMENT_2
			} else {
				this._state = IN_COMMENT;
			}
		}

		/*
		*	cdata
		*/
		else if(this._state === BEFORE_CDATA_1){
			if(c === "C") this._state = BEFORE_CDATA_2;
			else this._state = IN_DECLARATION;
		} else if(this._state === BEFORE_CDATA_2){
			if(c === "D") this._state = BEFORE_CDATA_3;
			else this._state = IN_DECLARATION;
		} else if(this._state === BEFORE_CDATA_3){
			if(c === "A") this._state = BEFORE_CDATA_4;
			else this._state = IN_DECLARATION;
		} else if(this._state === BEFORE_CDATA_4){
			if(c === "T") this._state = BEFORE_CDATA_5;
			else this._state = IN_DECLARATION;
		} else if(this._state === BEFORE_CDATA_5){
			if(c === "A") this._state = BEFORE_CDATA_6;
			else this._state = IN_DECLARATION;
		} else if(this._state === BEFORE_CDATA_6){
			if(c === "["){
				this._state = IN_CDATA;
				this._sectionStart = this._index + 1;
			} else {
				this._state = IN_DECLARATION;
			}
		} else if(this._state === IN_CDATA){
			if(c === "]") this._state = AFTER_CDATA_1;
		} else if(this._state === AFTER_CDATA_1){
			if(c === "]") this._state = AFTER_CDATA_2;
			else this._state = IN_CDATA;
		} else if(this._state === AFTER_CDATA_2){
			if(c === ">"){
				//remove 2 trailing chars
				this._cbs.oncdata(this._buffer.substring(this._sectionStart, this._index - 2));
				this._state = TEXT;
				this._sectionStart = this._index + 1;
			} else if (c === ']') {
				// Keep the state at AFTER_CDATA_2
			}else {
				this._state = IN_CDATA;
			}
		}

		/*
		* special tags
		*/
		else if(this._state === BEFORE_SPECIAL){
			if(c === "c" || c === "C"){
				this._state = BEFORE_SCRIPT_1;
			} else if(c === "t" || c === "T"){
				this._state = BEFORE_STYLE_1;
			} else {
				this._state = IN_TAG_NAME;
				this._index--; //consume the token again
			}
		} else if(this._state === BEFORE_SPECIAL_END){
			if(this._special === 1 && (c === "c" || c === "C")){
				this._state = AFTER_SCRIPT_1;
			} else if(this._special === 2 && (c === "t" || c === "T")){
				this._state = AFTER_STYLE_1;
			} 
			else this._state = TEXT;
		}

		/*
		* script
		*/
		else if(this._state === BEFORE_SCRIPT_1){
			if(c === "r" || c === "R"){
				this._state = BEFORE_SCRIPT_2;
			} else {
				this._state = IN_TAG_NAME;
				this._index--; //consume the token again
			}
		} else if(this._state === BEFORE_SCRIPT_2){
			if(c === "i" || c === "I"){
				this._state = BEFORE_SCRIPT_3;
			} else {
				this._state = IN_TAG_NAME;
				this._index--; //consume the token again
			}
		} else if(this._state === BEFORE_SCRIPT_3){
			if(c === "p" || c === "P"){
				this._state = BEFORE_SCRIPT_4;
			} else {
				this._state = IN_TAG_NAME;
				this._index--; //consume the token again
			}
		} else if(this._state === BEFORE_SCRIPT_4){
			if(c === "t" || c === "T"){
				this._state = BEFORE_SCRIPT_5;
			} else {
				this._state = IN_TAG_NAME;
				this._index--; //consume the token again
			}
		} else if(this._state === BEFORE_SCRIPT_5){
			if(c === "/" || c === ">" || whitespace(c)){
				this._special = 1;
			}
			this._state = IN_TAG_NAME;
			this._index--; //consume the token again
		}

		else if(this._state === AFTER_SCRIPT_1){
			if(c === "r" || c === "R"){
				this._state = AFTER_SCRIPT_2;
			} 
			else this._state = TEXT;
		} else if(this._state === AFTER_SCRIPT_2){
			if(c === "i" || c === "I"){
				this._state = AFTER_SCRIPT_3;
			} 
			else this._state = TEXT;
		} else if(this._state === AFTER_SCRIPT_3){
			if(c === "p" || c === "P"){
				this._state = AFTER_SCRIPT_4;
			} 
			else this._state = TEXT;
		} else if(this._state === AFTER_SCRIPT_4){
			if(c === "t" || c === "T"){
				this._state = AFTER_SCRIPT_5;
			} 
			else this._state = TEXT;
		} else if(this._state === AFTER_SCRIPT_5){
			if(c === ">" || whitespace(c)){
				this._state = IN_CLOSING_TAG_NAME;
				this._sectionStart = this._index - 6;
				this._index--; //reconsume the token
			} 
			else this._state = TEXT;
		}

		/*
		* style
		*/
		else if(this._state === BEFORE_STYLE_1){
			if(c === "y" || c === "Y"){
				this._state = BEFORE_STYLE_2;
			} else {
				this._state = IN_TAG_NAME;
				this._index--; //consume the token again
			}
		} else if(this._state === BEFORE_STYLE_2){
			if(c === "l" || c === "L"){
				this._state = BEFORE_STYLE_3;
			} else {
				this._state = IN_TAG_NAME;
				this._index--; //consume the token again
			}
		} else if(this._state === BEFORE_STYLE_3){
			if(c === "e" || c === "E"){
				this._state = BEFORE_STYLE_4;
			} else {
				this._state = IN_TAG_NAME;
				this._index--; //consume the token again
			}
		} else if(this._state === BEFORE_STYLE_4){
			if(c === "/" || c === ">" || whitespace(c)){
				this._special = 2;
			}
			this._state = IN_TAG_NAME;
			this._index--; //consume the token again
		}

		else if(this._state === AFTER_STYLE_1){
			if(c === "y" || c === "Y"){
				this._state = AFTER_STYLE_2;
			} 
			else this._state = TEXT;
		} else if(this._state === AFTER_STYLE_2){
			if(c === "l" || c === "L"){
				this._state = AFTER_STYLE_3;
			} 
			else this._state = TEXT;
		} else if(this._state === AFTER_STYLE_3){
			if(c === "e" || c === "E"){
				this._state = AFTER_STYLE_4;
			} 
			else this._state = TEXT;
		} else if(this._state === AFTER_STYLE_4){
			if(c === ">" || whitespace(c)){
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
		this._buffer = "";
		this._index = 0;
	} else {
		if(this._state === TEXT){
			this._emitIfToken("ontext");
			this._buffer = "";
			this._index = 0;
		} else if(this._sectionStart === this._index){
			//the section just started
			this._buffer = "";
			this._index = 0;
		} else if(this._sectionStart > 0){
			//remove everything unnecessary
			this._buffer = this._buffer.substr(this._sectionStart);
			this._index -= this._sectionStart;
		}

		this._sectionStart = 0;
	}
};

Tokenizer.prototype.pause = function(){
	this._running = false;
};
Tokenizer.prototype.resume = function(){
	this._running = true;
};

Tokenizer.prototype.end = function(chunk){
	if(chunk) this.write(chunk);

	//if there is remaining data, emit it in a reasonable way
	if(this._buffer === "" || this._sectionStart === -1 || this._sectionStart === this._index);
	else if(this._state === IN_CDATA || this._state === AFTER_CDATA_1 || this._state === AFTER_CDATA_2){
		this._emitIfToken("oncdata");
	} else if(this._state === IN_COMMENT || this._state === AFTER_COMMENT_1 || this._state === AFTER_COMMENT_2){
		this._emitIfToken("oncomment");
	} else if(this._state === IN_TAG_NAME){
		this._emitIfToken("onopentagname");
	} else if(this._state === IN_CLOSING_TAG_NAME){
		this._emitIfToken("onclosetag");
	} else {
		this._emitIfToken("ontext");
	}

	this._cbs.onend();
};

Tokenizer.prototype.reset = function(){
	Tokenizer.call(this, this._options, this._cbs);
};

Tokenizer.prototype._emitToken = function(name){
	this._cbs[name](this._buffer.substring(this._sectionStart, this._index));
	this._sectionStart = -1;
};

Tokenizer.prototype._emitIfToken = function(name){
	if(this._index > this._sectionStart){
		this._cbs[name](this._buffer.substring(this._sectionStart, this._index));
	}
	this._sectionStart = -1;
};
