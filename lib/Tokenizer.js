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
	return c === " " || c === "\n" || c === "\t" || c === "\f";
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
	this._reconsume = false;
	this._xmlMode = this._options && this._options.xmlMode;
}

Tokenizer.prototype._stateText = function (c) {
	if(c === "<"){
		this._emitIfToken("ontext");
		this._state = BEFORE_TAG_NAME;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateBeforeTagName = function (c) {
	if(c === "/"){
		this._state = BEFORE_CLOSING_TAG_NAME;
	} else if(c === ">" || this._special > 0 || whitespace(c)) {
		this._state = TEXT;
	} else if(whitespace(c)) {
		// skip
	} else if(c === "!"){
		this._state = BEFORE_DECLARATION;
		this._sectionStart = this._index + 1;
	} else if(c === "?"){
		this._state = IN_PROCESSING_INSTRUCTION;
		this._sectionStart = this._index + 1;
	} else if(!this._xmlMode && (c === "s" || c === "S")){
		this._state = BEFORE_SPECIAL;
		this._sectionStart = this._index;
	} else {
		this._state = IN_TAG_NAME;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateInTagName = function (c) {
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
};

Tokenizer.prototype._stateBeforeCloseingTagName = function (c) {
	if(whitespace(c));
	else if(c === ">"){
		this._state = TEXT;
	} else if(this._special > 0){
		if(c === "s" || c === "S"){
			this._state = BEFORE_SPECIAL_END;
		} else {
			this._state = TEXT;
			this._reconsume = true;
		}
	} else {
		this._state = IN_CLOSING_TAG_NAME;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateInCloseingTagName = function (c) {
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
};

Tokenizer.prototype._stateAfterCloseingTagName = function (c) {
	//skip everything until ">"
	if(c === ">"){
		this._state = TEXT;
		this._sectionStart = this._index + 1;
	}
};

Tokenizer.prototype._stateBeforeAttributeName = function (c) {
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
};

Tokenizer.prototype._stateInAttributeName = function (c) {
	if(c === "="){
		this._emitIfToken("onattribname");
		this._state = BEFORE_ATTRIBUTE_VALUE;
	} else if(whitespace(c)){
		this._emitIfToken("onattribname");
		this._state = AFTER_ATTRIBUTE_NAME;
	} else if(c === "/" || c === ">"){
		this._emitIfToken("onattribname");
		this._state = BEFORE_ATTRIBUTE_NAME;
		this._reconsume = true;
	}
};

Tokenizer.prototype._stateAfterAttributeName = function (c) {
	if(c === "="){
		this._state = BEFORE_ATTRIBUTE_VALUE;
	} else if(c === "/" || c === ">"){
		this._state = BEFORE_ATTRIBUTE_NAME;
		this._reconsume = true;
	} else if(!whitespace(c)){
		this._state = IN_ATTRIBUTE_NAME;
		this._sectionStart = this._index;
	}
};

Tokenizer.prototype._stateBeforeAttributeValue = function (c) {
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
};

Tokenizer.prototype._stateInAttributeValueDoubleQuotes = function (c) {
	if(c === "\""){
		this._emitToken("onattribvalue");
		this._state = BEFORE_ATTRIBUTE_NAME;
	}
};

Tokenizer.prototype._stateInAttributeValueSingleQuotes = function (c) {
	if(c === "'"){
		this._state = BEFORE_ATTRIBUTE_NAME;
		this._emitToken("onattribvalue");
	}
};

Tokenizer.prototype._stateInAttributeValueNoQuotes = function (c) {
	if(c === ">"){
		this._emitToken("onattribvalue");
		this._state = TEXT;
		this._cbs.onopentagend();
		this._sectionStart = this._index + 1;
	} else if(whitespace(c)){
		this._emitToken("onattribvalue");
		this._state = BEFORE_ATTRIBUTE_NAME;
	}
};

Tokenizer.prototype._stateBeforeDeclaration = function (c) {
	if(c === "[") this._state = BEFORE_CDATA_1;
	else if(c === "-") this._state = BEFORE_COMMENT;
	else this._state = IN_DECLARATION;
};

Tokenizer.prototype._stateInDeclaration = function (c) {
	if(c === ">"){
		this._emitToken("ondeclaration");
		this._state = TEXT;
		this._sectionStart = this._index + 1;
	}
};

Tokenizer.prototype._stateInProcessingInstruction = function (c) {
	if(c === ">"){
		this._emitToken("onprocessinginstruction");
		this._state = TEXT;
		this._sectionStart = this._index + 1;
	}
};

Tokenizer.prototype._stateBeforeComment = function (c) {
	if(c === "-"){
		this._state = IN_COMMENT;
		this._sectionStart = this._index + 1;
	} else {
		this._state = IN_DECLARATION;
	}
};

Tokenizer.prototype._stateInComment = function (c) {
	if(c === "-") this._state = AFTER_COMMENT_1;
};

Tokenizer.prototype._stateAfterComment1 = function (c) {
	if(c === "-") this._state = AFTER_COMMENT_2;
	else this._state = IN_COMMENT;
};

Tokenizer.prototype._stateAfterComment2 = function (c) {
	if(c === ">"){
		//remove 2 trailing chars
		this._cbs.oncomment(this._buffer.substring(this._sectionStart, this._index - 2));
		this._state = TEXT;
		this._sectionStart = this._index + 1;
	} else if (c !== "-") {
		this._state = IN_COMMENT;
	}
	// else: stay in AFTER_COMMENT_2 (`--->`)
};

Tokenizer.prototype._stateBeforeCdata1 = function (c) {
	if(c === "C") this._state = BEFORE_CDATA_2;
	else this._state = IN_DECLARATION;
};

Tokenizer.prototype._stateBeforeCdata2 = function (c) {
	if(c === "D") this._state = BEFORE_CDATA_3;
	else this._state = IN_DECLARATION;
};

Tokenizer.prototype._stateBeforeCdata3 = function (c) {
	if(c === "A") this._state = BEFORE_CDATA_4;
	else this._state = IN_DECLARATION;
};

Tokenizer.prototype._stateBeforeCdata4 = function (c) {
	if(c === "T") this._state = BEFORE_CDATA_5;
	else this._state = IN_DECLARATION;
};

Tokenizer.prototype._stateBeforeCdata5 = function (c) {
	if(c === "A") this._state = BEFORE_CDATA_6;
	else this._state = IN_DECLARATION;
};

Tokenizer.prototype._stateBeforeCdata6 = function (c) {
	if(c === "["){
		this._state = IN_CDATA;
		this._sectionStart = this._index + 1;
	} else {
		this._state = IN_DECLARATION;
	}
};

Tokenizer.prototype._stateInCdata = function (c) {
	if(c === "]") this._state = AFTER_CDATA_1;
};

Tokenizer.prototype._stateAfterCdata1 = function (c) {
	if(c === "]") this._state = AFTER_CDATA_2;
	else this._state = IN_CDATA;
};

Tokenizer.prototype._stateAfterCdata2 = function (c) {
	if(c === ">"){
		//remove 2 trailing chars
		this._cbs.oncdata(this._buffer.substring(this._sectionStart, this._index - 2));
		this._state = TEXT;
		this._sectionStart = this._index + 1;
	} else if (c !== "]") {
		this._state = IN_CDATA;
	}
	//else: stay in AFTER_CDATA_2 (`]]]>`)
};

Tokenizer.prototype._stateBeforeSpecial = function (c) {
  if(c === "c" || c === "C"){
		this._state = BEFORE_SCRIPT_1;
	} else if(c === "t" || c === "T"){
		this._state = BEFORE_STYLE_1;
	} else {
		this._state = IN_TAG_NAME;
		this._reconsume = true; //consume the token again
	}
};

Tokenizer.prototype._stateBeforeSpecialEnd = function (c) {
	if(this._special === 1 && (c === "c" || c === "C")){
		this._state = AFTER_SCRIPT_1;
	} else if(this._special === 2 && (c === "t" || c === "T")){
		this._state = AFTER_STYLE_1;
	}
	else this._state = TEXT;
};

Tokenizer.prototype._stateBeforeScript1 = function (c) {
	if(c === "r" || c === "R"){
		this._state = BEFORE_SCRIPT_2;
	} else {
		this._state = IN_TAG_NAME;
		this._reconsume = true; //consume the token again
	}
};

Tokenizer.prototype._stateBeforeScript2 = function (c) {
	if(c === "i" || c === "I"){
		this._state = BEFORE_SCRIPT_3;
	} else {
		this._state = IN_TAG_NAME;
		this._reconsume = true; //consume the token again
	}
};

Tokenizer.prototype._stateBeforeScript3 = function (c) {
	if(c === "p" || c === "P"){
		this._state = BEFORE_SCRIPT_4;
	} else {
		this._state = IN_TAG_NAME;
		this._reconsume = true; //consume the token again
	}
};

Tokenizer.prototype._stateBeforeScript4 = function (c) {
	if(c === "t" || c === "T"){
		this._state = BEFORE_SCRIPT_5;
	} else {
		this._state = IN_TAG_NAME;
		this._reconsume = true; //consume the token again
	}
};

Tokenizer.prototype._stateBeforeScript5 = function (c) {
	if(c === "/" || c === ">" || whitespace(c)){
		this._special = 1;
	}
	this._state = IN_TAG_NAME;
	this._reconsume = true; //consume the token again
};

Tokenizer.prototype._stateAfterScript1 = function (c) {
	if(c === "r" || c === "R") this._state = AFTER_SCRIPT_2;
	else this._state = TEXT;
};

Tokenizer.prototype._stateAfterScript2 = function (c) {
	if(c === "i" || c === "I") this._state = AFTER_SCRIPT_3;
	else this._state = TEXT;
};

Tokenizer.prototype._stateAfterScript3 = function (c) {
	if(c === "p" || c === "P") this._state = AFTER_SCRIPT_4;
	else this._state = TEXT;
};

Tokenizer.prototype._stateAfterScript4 = function (c) {
	if(c === "t" || c === "T") this._state = AFTER_SCRIPT_5;
	else this._state = TEXT;
};

Tokenizer.prototype._stateAfterScript5 = function (c) {
	if(c === ">" || whitespace(c)){
		this._state = IN_CLOSING_TAG_NAME;
		this._sectionStart = this._index - 6;
		this._reconsume = true; //reconsume the token
	}
	else this._state = TEXT;
};

Tokenizer.prototype._stateBeforeStyle1 = function (c) {
	if(c === "y" || c === "Y"){
		this._state = BEFORE_STYLE_2;
	} else {
		this._state = IN_TAG_NAME;
		this._reconsume = true; //consume the token again
	}
};

Tokenizer.prototype._stateBeforeStyle2 = function (c) {
	if(c === "l" || c === "L"){
		this._state = BEFORE_STYLE_3;
	} else {
		this._state = IN_TAG_NAME;
		this._reconsume = true; //consume the token again
	}
};

Tokenizer.prototype._stateBeforeStyle3 = function (c) {
	if(c === "e" || c === "E"){
		this._state = BEFORE_STYLE_4;
	} else {
		this._state = IN_TAG_NAME;
		this._reconsume = true; //consume the token again
	}
};

Tokenizer.prototype._stateBeforeStyle4 = function (c) {
	if(c === "/" || c === ">" || whitespace(c)){
		this._special = 2;
	}
	this._state = IN_TAG_NAME;
	this._reconsume = true; //consume the token again
};

Tokenizer.prototype._stateAfterStyle1 = function (c) {
	if(c === "y" || c === "Y") this._state = AFTER_STYLE_2;
	else this._state = TEXT;
};

Tokenizer.prototype._stateAfterStyle2 = function (c) {
	if(c === "l" || c === "L") this._state = AFTER_STYLE_3;
	else this._state = TEXT;
};

Tokenizer.prototype._stateAfterStyle3 = function (c) {
	if(c === "e" || c === "E") this._state = AFTER_STYLE_4;
	else this._state = TEXT;
};

Tokenizer.prototype._stateAfterStyle4 = function (c) {
	if(c === ">" || whitespace(c)){
		this._state = IN_CLOSING_TAG_NAME;
		this._sectionStart = this._index - 5;
		this._reconsume = true; //reconsume the token
	}
	else this._state = TEXT;
};

Tokenizer.prototype._cleanup = function () {
  if(this._sectionStart === -1){
		this._buffer = "";
		this._index = 0;
	} else {
		if(this._state === TEXT){
			if(this._sectionStart !== this._index){
				this._cbs.ontext(this._buffer.substr(this._sectionStart));
			}
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

//TODO make events conditional
Tokenizer.prototype.write = function(chunk){
	this._buffer += chunk;

	while(this._index < this._buffer.length && this._running){
		var c = this._buffer.charAt(this._index);
		if(this._state === TEXT) {
      this._stateText(c);
    } else if(this._state === BEFORE_TAG_NAME){
      this._stateBeforeTagName(c);
		} else if(this._state === IN_TAG_NAME) {
      this._stateInTagName(c);
		} else if(this._state === BEFORE_CLOSING_TAG_NAME){
      this._stateBeforeCloseingTagName(c);
		} else if(this._state === IN_CLOSING_TAG_NAME){
      this._stateInCloseingTagName(c);
		} else if(this._state === AFTER_CLOSING_TAG_NAME){
      this._stateAfterCloseingTagName(c);
		}

		/*
		*	attributes
		*/
		else if(this._state === BEFORE_ATTRIBUTE_NAME){
      this._stateBeforeAttributeName(c);
		} else if(this._state === IN_ATTRIBUTE_NAME){
      this._stateInAttributeName(c);
		} else if(this._state === AFTER_ATTRIBUTE_NAME){
      this._stateAfterAttributeName(c);
		} else if(this._state === BEFORE_ATTRIBUTE_VALUE){
      this._stateBeforeAttributeValue(c);
		} else if(this._state === IN_ATTRIBUTE_VALUE_DOUBLE_QUOTES){
      this._stateInAttributeValueDoubleQuotes(c);
		} else if(this._state === IN_ATTRIBUTE_VALUE_SINGLE_QUOTES){
      this._stateInAttributeValueSingleQuotes(c);
		} else if(this._state === IN_ATTRIBUTE_VALUE_NO_QUOTES){
      this._stateInAttributeValueNoQuotes(c);
		}

		/*
		*	declarations
		*/
		else if(this._state === BEFORE_DECLARATION){
      this._stateBeforeDeclaration(c);
		} else if(this._state === IN_DECLARATION){
			this._stateInDeclaration(c);
		}

		/*
		*	processing instructions
		*/
		else if(this._state === IN_PROCESSING_INSTRUCTION){
			this._stateInProcessingInstruction(c);
		}

		/*
		*	comments
		*/
		else if(this._state === BEFORE_COMMENT){
      this._stateBeforeComment(c);
		} else if(this._state === IN_COMMENT){
			this._stateInComment(c);
		} else if(this._state === AFTER_COMMENT_1){
			this._stateAfterComment1(c);
		} else if(this._state === AFTER_COMMENT_2){
      this._stateAfterComment2(c);
		}

		/*
		*	cdata
		*/
		else if(this._state === BEFORE_CDATA_1){
			this._stateBeforeCdata1(c);
		} else if(this._state === BEFORE_CDATA_2){
			this._stateBeforeCdata2(c);
		} else if(this._state === BEFORE_CDATA_3){
			this._stateBeforeCdata3(c);
		} else if(this._state === BEFORE_CDATA_4){
			this._stateBeforeCdata4(c);
		} else if(this._state === BEFORE_CDATA_5){
			this._stateBeforeCdata5(c);
		} else if(this._state === BEFORE_CDATA_6){
			this._stateBeforeCdata6(c);
		} else if(this._state === IN_CDATA){
			this._stateInCdata(c);
		} else if(this._state === AFTER_CDATA_1){
			this._stateAfterCdata1(c);
		} else if(this._state === AFTER_CDATA_2){
      this._stateAfterCdata2(c);
		}

		/*
		* special tags
		*/
		else if(this._state === BEFORE_SPECIAL){
			this._stateBeforeSpecial(c);
		} else if(this._state === BEFORE_SPECIAL_END){
      this._stateBeforeSpecialEnd(c);
		}

		/*
		* script
		*/
		else if(this._state === BEFORE_SCRIPT_1){
      this._stateBeforeScript1(c);
		} else if(this._state === BEFORE_SCRIPT_2){
      this._stateBeforeScript2(c);
		} else if(this._state === BEFORE_SCRIPT_3){
      this._stateBeforeScript3(c);
		} else if(this._state === BEFORE_SCRIPT_4){
      this._stateBeforeScript4(c);
		} else if(this._state === BEFORE_SCRIPT_5){
      this._stateBeforeScript5(c);
		}

		else if(this._state === AFTER_SCRIPT_1){
      this._stateAfterScript1(c);
		} else if(this._state === AFTER_SCRIPT_2){
      this._stateAfterScript2(c);
		} else if(this._state === AFTER_SCRIPT_3){
      this._stateAfterScript3(c);
		} else if(this._state === AFTER_SCRIPT_4){
      this._stateAfterScript4(c);
		} else if(this._state === AFTER_SCRIPT_5){
      this._stateAfterScript5(c);
		}

		/*
		* style
		*/
		else if(this._state === BEFORE_STYLE_1){
      this._stateBeforeStyle1(c);
		} else if(this._state === BEFORE_STYLE_2){
      this._stateBeforeStyle2(c);
		} else if(this._state === BEFORE_STYLE_3){
      this._stateBeforeStyle3(c);
		} else if(this._state === BEFORE_STYLE_4){
      this._stateBeforeStyle4(c);
		}

		else if(this._state === AFTER_STYLE_1){
      this._stateAfterStyle1(c);
		} else if(this._state === AFTER_STYLE_2){
      this._stateAfterStyle2(c);
		} else if(this._state === AFTER_STYLE_3){
      this._stateAfterStyle3(c);
		} else if(this._state === AFTER_STYLE_4){
      this._stateAfterStyle4(c);
		}

		else {
			this._cbs.onerror(Error("unknown _state"), this._state);
		}

    if (this._reconsume) {
      this._reconsume = false;
    } else {
      this._index++;
    }
	}

	//cleanup
  this._cleanup();
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
	if(this._sectionStart > this._index){
		var data = this._buffer.substr(this._sectionStart);

		if(this._state === IN_CDATA || this._state === AFTER_CDATA_1 || this._state === AFTER_CDATA_2){
			this._cbs.oncdata(data);
		} else if(this._state === IN_COMMENT || this._state === AFTER_COMMENT_1 || this._state === AFTER_COMMENT_2){
			this._cbs.oncomment(data);
		} else if(this._state === IN_TAG_NAME){
			this._cbs.onopentagname(data);
		} else if(this._state === IN_CLOSING_TAG_NAME){
			this._cbs.onclosetag(data);
		} else {
			this._cbs.ontext(data);
		}
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
