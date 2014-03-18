module.exports = Tokenizer;

var decodeCodePoint = require("entities/lib/decode_codepoint.js"),
    entityMap = require("entities/maps/entities.json"),
    legacyMap = require("entities/maps/legacy.json"),
    xmlMap    = require("entities/maps/xml.json"),

    i = 0,

    DATA                      = i++,
    TAG_OPEN                  = i++, //after <
    TAG_NAME                  = i++,
    SELF_CLOSING_START_TAG    = i++,
    END_TAG_OPEN              = i++,
    IN_CLOSING_TAG_NAME       = i++,
    AFTER_CLOSING_TAG_NAME    = i++,

    //attributes
    BEFORE_ATTRIBUTE_NAME     = i++,
    ATTRIBUTE_NAME            = i++,
    AFTER_ATTRIBUTE_NAME      = i++,
    BEFORE_ATTRIBUTE_VALUE    = i++,
    ATTRIBUTE_VALUE_DQ        = i++, // "
    ATTRIBUTE_VALUE_SQ        = i++, // '
    ATTRIBUTE_VALUE_NQ        = i++,

    //comments
    MARKUP_DECLARATION_OPEN   = i++, // !
    BOGUS_COMMENT             = i++,
    BEFORE_COMMENT            = i++,
    COMMENT_START             = i++,
    COMMENT_START_DASH        = i++,
    COMMENT                   = i++,
    COMMENT_END_DASH          = i++,
    COMMENT_END               = i++,
    COMMENT_END_BANG          = i++,

    //cdata
    BEFORE_CDATA_1            = i++, // [
    BEFORE_CDATA_2            = i++, // C
    BEFORE_CDATA_3            = i++, // D
    BEFORE_CDATA_4            = i++, // A
    BEFORE_CDATA_5            = i++, // T
    BEFORE_CDATA_6            = i++, // A
    IN_CDATA                  = i++, // [
    AFTER_CDATA_1             = i++, // ]
    AFTER_CDATA_2             = i++, // ]

    //special tags
    BEFORE_SPECIAL            = i++, //S
    BEFORE_SPECIAL_END        = i++, //S

    BEFORE_SCRIPT_1           = i++, //C
    BEFORE_SCRIPT_2           = i++, //R
    BEFORE_SCRIPT_3           = i++, //I
    BEFORE_SCRIPT_4           = i++, //P
    BEFORE_SCRIPT_5           = i++, //T
    AFTER_SCRIPT_1            = i++, //C
    AFTER_SCRIPT_2            = i++, //R
    AFTER_SCRIPT_3            = i++, //I
    AFTER_SCRIPT_4            = i++, //P
    AFTER_SCRIPT_5            = i++, //T

    BEFORE_STYLE_1            = i++, //T
    BEFORE_STYLE_2            = i++, //Y
    BEFORE_STYLE_3            = i++, //L
    BEFORE_STYLE_4            = i++, //E
    AFTER_STYLE_1             = i++, //T
    AFTER_STYLE_2             = i++, //Y
    AFTER_STYLE_3             = i++, //L
    AFTER_STYLE_4             = i++, //E

    BEFORE_ENTITY             = i++, //&
    BEFORE_NUMERIC_ENTITY     = i++, //#
    IN_NAMED_ENTITY           = i++,
    IN_NUMERIC_ENTITY         = i++,
    IN_HEX_ENTITY             = i++, //X

	BEFORE_DOCTYPE_1          = i++, //D
	BEFORE_DOCTYPE_2          = i++, //O
	BEFORE_DOCTYPE_3          = i++, //C
	BEFORE_DOCTYPE_4          = i++, //T
	BEFORE_DOCTYPE_5          = i++, //Y
	BEFORE_DOCTYPE_6          = i++, //P
	BEFORE_DOCTYPE_NAME       = i++, //E
	DOCTYPE_NAME              = i++,
	AFTER_DOCTYPE_NAME        = i++,

    j = 0,

    SPECIAL_NONE              = j++,
    SPECIAL_SCRIPT            = j++,
    SPECIAL_STYLE             = j++;

function whitespace(c){
	return c === " " || c === "\n" || c === "\t" || c === "\f" || c === "\r";
}

function isLetter(c){
	return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z");
}

function characterState(char, SUCCESS){
	return function(c){
		if(c === char) this._state = SUCCESS;
	};
}

function ifElseState(char, SUCCESS, FAILURE){
	return function(c){
		if(c === char){
			this._state = SUCCESS;
		} else {
			this._state = FAILURE;
			this._index--;
		}
	};
}

function ifElseStateIC(upper, SUCCESS, FAILURE){
	var lower = upper.toLowerCase();

	if(upper === lower){
		return ifElseState(upper, SUCCESS, FAILURE);
	}

	return function(c){
		if(c === lower || c === upper){
			this._state = SUCCESS;
		} else {
			this._state = FAILURE;
			this._index--;
		}
	};
}

function consumeSpecialNameChar(upper, NEXT_STATE){
	var lower = upper.toLowerCase();

	return function(c){
		if(c === lower || c === upper){
			this._state = NEXT_STATE;
		} else {
			this._state = TAG_NAME;
			this._index--; //consume the token again
		}
	};
}

function Tokenizer(options, cbs){
	this._state = DATA;
	this._buffer = "";
	this._sectionStart = 0;
	this._index = 0;
	this._baseState = DATA;
	this._special = SPECIAL_NONE;
	this._cbs = cbs;
	this._running = true;
	this._ended = false;
	this._xmlMode = !!(options && options.xmlMode);
	this._decodeEntities = !!(options && options.decodeEntities);
}

var _$ = Tokenizer.prototype;


// 8.2.4.1 Data state

_$[DATA] = function(c){
	if(c === "<"){
		if(this._index > this._sectionStart){
			this._cbs.ontext(this._getSection());
		}
		this._state = TAG_OPEN;
		this._sectionStart = this._index;
	} else if(this._decodeEntities && this._special === SPECIAL_NONE && c === "&"){
		if(this._index > this._sectionStart){
			this._cbs.ontext(this._getSection());
		}
		this._baseState = DATA;
		this._state = BEFORE_ENTITY;
		this._sectionStart = this._index;
	} //  parse error (c === "\0")
};

//TODO 8.2.4.5 RAWTEXT state

// 8.2.4.8 Tag open state

_$[TAG_OPEN] = function(c){
	if(c === "/"){
		this._state = END_TAG_OPEN;
	} else if(c === ">" || this._special !== SPECIAL_NONE || whitespace(c)) {
		this._state = DATA;
	} else if(c === "!"){
		this._state = MARKUP_DECLARATION_OPEN;
		this._sectionStart = this._index + 1;
	} else if(c === "?"){
		this._state = BOGUS_COMMENT;
		this._sectionStart = this._index;
	} else if(isLetter(c)){
		this._state = (!this._xmlMode && (c === "s" || c === "S")) ?
						BEFORE_SPECIAL : TAG_NAME;
		this._sectionStart = this._index;
	} else {
		// parse error
		this._cbs.ontext(this._getSection());
		this._sectionStart = this._index;
	}
};

// 8.2.4.9 End tag open state

_$[END_TAG_OPEN] = function(c){
	if(this._special !== SPECIAL_NONE){
		if(c === "s" || c === "S"){
			this._state = BEFORE_SPECIAL_END;
		} else {
			this._state = DATA;
			this._index--;
		}
	} else if(isLetter(c)){
		this._state = IN_CLOSING_TAG_NAME;
		this._sectionStart = this._index;
	} else if(c === ">"){
		this._state = DATA;
	} else {
		this._state = BOGUS_COMMENT;
		this._sectionStart = this._index;
	}
};

// 8.2.4.10 Tag name state
//FIXME simplified

_$[TAG_NAME] = function(c){
	if(c === "/" || c === ">" || whitespace(c)){
		this._cbs.onopentagname(this._getEndingSection());
		this._state = BEFORE_ATTRIBUTE_NAME;
		this._index--;
	}
};

// 8.2.4.34 Before attribute name state

_$[BEFORE_ATTRIBUTE_NAME] = function(c){
	if(c === ">"){
		this._cbs.onopentagend();
		this._sectionStart = this._index + 1;
		this._state = DATA;
	} else if(c === "/"){
		this._state = SELF_CLOSING_START_TAG;
	} else if(!whitespace(c)){
		// parse error (c === "\"" || c === "'" || c === "<" || c === "=")
		this._state = ATTRIBUTE_NAME;
		this._sectionStart = this._index;
	}
};

// 8.2.4.35 Attribute name state
//FIXME simplified

_$[ATTRIBUTE_NAME] = function(c){
	if(c === "=" || c === "/" || c === ">" || whitespace(c)){
		this._cbs.onattribname(this._getEndingSection());
		this._state = AFTER_ATTRIBUTE_NAME;
		this._index--;
	}
};

// 8.2.4.36 After attribute name state

_$[AFTER_ATTRIBUTE_NAME] = function(c){
	if(c === "="){
		this._state = BEFORE_ATTRIBUTE_VALUE;
	} else if(c === "/"){
		this._cbs.onattribend();
		this._state = SELF_CLOSING_START_TAG;
	} else if(c === ">"){
		this._cbs.onattribend();
		this._cbs.onopentagend();
		this._sectionStart = this._index + 1;
		this._state = DATA;
	} else if(!whitespace(c)){
		// parse error (c === "\"" || c === "'" || c === "<")
		this._cbs.onattribend();
		this._state = ATTRIBUTE_NAME;
		this._sectionStart = this._index;
	}
};

// 8.2.4.37 Before attribute value state

_$[BEFORE_ATTRIBUTE_VALUE] = function(c){
	if(c === "\""){
		this._state = ATTRIBUTE_VALUE_DQ;
		this._sectionStart = this._index + 1;
	} else if(c === "'"){
		this._state = ATTRIBUTE_VALUE_SQ;
		this._sectionStart = this._index + 1;
	} else if(c === ">"){
		// parse error
		this._cbs.onattribend();
		this._cbs.onopentagend();
		this._sectionStart = this._index + 1;
		this._state = DATA;
	} else if(!whitespace(c)){
		// parse error (c === "<" || c === "=")
		this._sectionStart = this._index;
		if(c === "&"){
			this._baseState = ATTRIBUTE_VALUE_NQ;
			this._state = BEFORE_ENTITY;
		} else {
			this._state = ATTRIBUTE_VALUE_NQ;
		}
	}
};

// 8.2.4.38 Attribute value (double-quoted) state

_$[ATTRIBUTE_VALUE_DQ] = function(c){
	if(c === "\""){
		this._cbs.onattribdata(this._getEndingSection());
		this._cbs.onattribend();
		this._state = BEFORE_ATTRIBUTE_NAME;
	} else if(this._decodeEntities && c === "&"){
		this._cbs.onattribdata(this._getEndingSection());
		this._baseState = this._state;
		this._state = BEFORE_ENTITY;
		this._sectionStart = this._index;
	}
};

// 8.2.4.39 Attribute value (single-quoted) state

_$[ATTRIBUTE_VALUE_SQ] = function(c){
	if(c === "'"){
		this._cbs.onattribdata(this._getEndingSection());
		this._cbs.onattribend();
		this._state = BEFORE_ATTRIBUTE_NAME;
	} else if(this._decodeEntities && c === "&"){
		this._cbs.onattribdata(this._getEndingSection());
		this._baseState = this._state;
		this._state = BEFORE_ENTITY;
		this._sectionStart = this._index;
	}
};

// 8.2.4.40 Attribute value (unquoted) state

_$[ATTRIBUTE_VALUE_NQ] = function(c){
	if(whitespace(c)){
		this._cbs.onattribdata(this._getEndingSection());
		this._cbs.onattribend();
		this._state = BEFORE_ATTRIBUTE_NAME;
	} else if(c === ">"){
		this._cbs.onattribdata(this._getPartialSection());
		this._cbs.onattribend();
		this._cbs.onopentagend();
		this._state = DATA;
	} else if(this._decodeEntities && c === "&"){
		this._cbs.onattribdata(this._getEndingSection());
		this._baseState = this._state;
		this._state = BEFORE_ENTITY;
		this._sectionStart = this._index;
	}
	// parse error (c === "\"" || c === "'" || c === "<" || c === "=" || c === "`")
};

// Ignored 8.2.4.42 After attribute value (quoted) state

// 8.2.4.43 Self-closing start tag state

_$[SELF_CLOSING_START_TAG] = function(c){
	if(c === ">"){
		this._cbs.onselfclosingtag();
		this._sectionStart = this._index + 1;
		this._state = DATA;
	} else if(!whitespace(c)){
		this._state = BEFORE_ATTRIBUTE_NAME;
		this._index--;
	}
};

// 8.2.4.44 Bogus comment state

_$[BOGUS_COMMENT] = function(c){
	if(c === ">"){
		this._cbs.onboguscomment(this._getPartialSection());
		this._state = DATA;
	}
};

// 8.2.4.45 Markup declaration open state

_$[MARKUP_DECLARATION_OPEN] = function(c){
	this._sectionStart = this._index;

	if(c === "-"){
		this._state = BEFORE_COMMENT;
	} else if(c === "d" || c === "D"){
		this._state = BEFORE_DOCTYPE_1;
	} else if(c === "["){ //TODO check context?
		this._state = BEFORE_CDATA_1;
	} else {
		this._state = BOGUS_COMMENT;
	}
};

_$[BEFORE_COMMENT] = function(c){
	if(c === "-"){
		this._state = COMMENT_START;
		this._sectionStart = this._index + 1;
	} else {
		this._state = BOGUS_COMMENT;
	}
};

// 8.2.4.46 Comment start state

_$[COMMENT_START] = function(c){
	if(c === "-"){
		this._state = COMMENT_START_DASH;
	} else if(c === ">"){
		// parse error
		this._cbs.oncomment("");
		this._sectionStart = this._index + 1;
		this._state = DATA;
	} else {
		this._state = COMMENT;
	}
};

// 8.2.4.47 Comment start dash state

_$[COMMENT_START_DASH] = function(c){
	if(c === "-"){
		this._state = COMMENT_END;
	} else if(c === ">"){
		// parse error
		this._cbs.oncomment("");
		this._sectionStart = this._index + 1;
		this._state = DATA;
	} else {
		this._state = COMMENT;
	}
};

// 8.2.4.48 Comment state
// 8.2.4.49 Comment end dash state

_$[COMMENT]          = characterState("-", COMMENT_END_DASH);
_$[COMMENT_END_DASH] = characterState("-", COMMENT_END);

// 8.2.4.50 Comment end state

_$[COMMENT_END] = function(c){
	if(c === ">"){
		//remove 2 trailing chars
		this._cbs.oncomment(this._buffer.substring(this._sectionStart, this._index - 2));
		this._sectionStart = this._index + 1;
		this._state = DATA;
	} else if(c === "!"){
		this._state = COMMENT_END_BANG;
	} else if(c !== "-"){
		this._state = COMMENT;
	}
	// else: stay in COMMENT_END (`--->`)
};

// 8.2.4.51 Comment end bang state

_$[COMMENT_END_BANG] = function(c){
	if(c === ">"){
		//remove trailing !
		this._cbs.oncomment(this._buffer.substring(this._sectionStart, this._index - 1));
		this._sectionStart = this._index + 1;
		this._state = DATA;
	} else if(c === "-"){
		this._state = COMMENT_END_DASH;
	} else {
		this._state = COMMENT;
	}
};

_$[IN_CLOSING_TAG_NAME] = function(c){
	if(c === ">" || whitespace(c)){
		this._cbs.onclosetag(this._getEndingSection());
		this._state = AFTER_CLOSING_TAG_NAME;
		this._index--;
	}
};

_$[AFTER_CLOSING_TAG_NAME] = function(c){
	//skip everything until ">"
	if(c === ">"){
		this._sectionStart = this._index + 1;
		this._state = DATA;
	}
};

_$[BEFORE_DOCTYPE_1] = ifElseStateIC("O", BEFORE_DOCTYPE_2, BOGUS_COMMENT);
_$[BEFORE_DOCTYPE_2] = ifElseStateIC("C", BEFORE_DOCTYPE_3, BOGUS_COMMENT);
_$[BEFORE_DOCTYPE_3] = ifElseStateIC("T", BEFORE_DOCTYPE_4, BOGUS_COMMENT);
_$[BEFORE_DOCTYPE_4] = ifElseStateIC("Y", BEFORE_DOCTYPE_5, BOGUS_COMMENT);
_$[BEFORE_DOCTYPE_5] = ifElseStateIC("P", BEFORE_DOCTYPE_6, BOGUS_COMMENT);
_$[BEFORE_DOCTYPE_6] = ifElseStateIC("E", BEFORE_DOCTYPE_NAME, BOGUS_COMMENT);

// Ignored: 8.2.4.52 DOCTYPE state - parse error when whitespace missing (<!DOCTYPEfoo>)

// 8.2.4.53 Before DOCTYPE name state
_$[BEFORE_DOCTYPE_NAME] = function(c){
	if(whitespace(c));
	else if(c === ">"){
		this._cbs.ondoctypename("");
		this._cbs.ondoctypeend();
		this._sectionStart = this._index + 1;
		this._state = DATA;
	} else {
		this._state = DOCTYPE_NAME;
		this._sectionStart = this._index;
	}
};

// 8.2.4.54 DOCTYPE name state
_$[DOCTYPE_NAME] = function(c){
	if(whitespace(c)){
		this._cbs.emit(this._getPartialSection());
		this._state = AFTER_DOCTYPE_NAME;
	} else if(c === ">"){
		this._cbs.ondoctypename(this._getPartialSection());
		this._cbs.ondoctypeend();
		this._state = DATA;
	}
};

// 8.2.4.55 After DOCTYPE name state
_$[AFTER_DOCTYPE_NAME] = function(c){
	if(c === ">"){
		this._cbs.ondoctypeend();
		this._sectionStart = this._index + 1;
		this._state = DATA;
	} /*else if(c === "P" || c === "p"){
		this._state = DOCTPYE_PUBLIC_1;
	} else if(c === "S" || c === "s"){
		this._state = DOCTYPE_SYSTEM_1;
	} else {
		this._state = BOGUS_DOCTYPE;
	} */ //TODO
};

_$[BEFORE_CDATA_1] = ifElseStateIC("C", BEFORE_CDATA_2, BOGUS_COMMENT);
_$[BEFORE_CDATA_2] = ifElseStateIC("D", BEFORE_CDATA_3, BOGUS_COMMENT);
_$[BEFORE_CDATA_3] = ifElseStateIC("A", BEFORE_CDATA_4, BOGUS_COMMENT);
_$[BEFORE_CDATA_4] = ifElseStateIC("T", BEFORE_CDATA_5, BOGUS_COMMENT);
_$[BEFORE_CDATA_5] = ifElseStateIC("A", BEFORE_CDATA_6, BOGUS_COMMENT);

_$[BEFORE_CDATA_6] = function(c){
	if(c === "["){
		this._state = IN_CDATA;
		this._sectionStart = this._index + 1;
	} else {
		this._state = BOGUS_COMMENT;
		this._index--;
	}
};

_$[IN_CDATA] = characterState("]", AFTER_CDATA_1);
_$[AFTER_CDATA_1] = characterState("]", AFTER_CDATA_2);

_$[AFTER_CDATA_2] = function(c){
	if(c === ">"){
		//remove 2 trailing chars
		this._cbs.oncdata(this._buffer.substring(this._sectionStart, this._index - 2));
		this._sectionStart = this._index + 1;
		this._state = DATA;
	} else if (c !== "]") {
		this._state = IN_CDATA;
	}
	//else: stay in AFTER_CDATA_2 (`]]]>`)
};

_$[BEFORE_SPECIAL] = function(c){
	if(c === "c" || c === "C"){
		this._state = BEFORE_SCRIPT_1;
	} else if(c === "t" || c === "T"){
		this._state = BEFORE_STYLE_1;
	} else {
		this._state = TAG_NAME;
		this._index--; //consume the token again
	}
};

_$[BEFORE_SPECIAL_END] = function(c){
	if(this._special === SPECIAL_SCRIPT && (c === "c" || c === "C")){
		this._state = AFTER_SCRIPT_1;
	} else if(this._special === SPECIAL_STYLE && (c === "t" || c === "T")){
		this._state = AFTER_STYLE_1;
	}
	else this._state = DATA;
};

_$[BEFORE_SCRIPT_1] = consumeSpecialNameChar("R", BEFORE_SCRIPT_2);
_$[BEFORE_SCRIPT_2] = consumeSpecialNameChar("I", BEFORE_SCRIPT_3);
_$[BEFORE_SCRIPT_3] = consumeSpecialNameChar("P", BEFORE_SCRIPT_4);
_$[BEFORE_SCRIPT_4] = consumeSpecialNameChar("T", BEFORE_SCRIPT_5);

_$[BEFORE_SCRIPT_5] = function(c){
	if(c === "/" || c === ">" || whitespace(c)){
		this._special = SPECIAL_SCRIPT;
	}
	this._state = TAG_NAME;
	this._index--; //consume the token again
};

_$[AFTER_SCRIPT_1] = ifElseStateIC("R", AFTER_SCRIPT_2, DATA);
_$[AFTER_SCRIPT_2] = ifElseStateIC("I", AFTER_SCRIPT_3, DATA);
_$[AFTER_SCRIPT_3] = ifElseStateIC("P", AFTER_SCRIPT_4, DATA);
_$[AFTER_SCRIPT_4] = ifElseStateIC("T", AFTER_SCRIPT_5, DATA);

_$[AFTER_SCRIPT_5] = function(c){
	if(c === ">" || whitespace(c)){
		this._special = SPECIAL_NONE;
		this._state = IN_CLOSING_TAG_NAME;
		this._sectionStart = this._index - 6;
		this._index--; //reconsume the token
	}
	else this._state = DATA;
};

_$[BEFORE_STYLE_1] = consumeSpecialNameChar("Y", BEFORE_STYLE_2);
_$[BEFORE_STYLE_2] = consumeSpecialNameChar("L", BEFORE_STYLE_3);
_$[BEFORE_STYLE_3] = consumeSpecialNameChar("E", BEFORE_STYLE_4);

_$[BEFORE_STYLE_4] = function(c){
	if(c === "/" || c === ">" || whitespace(c)){
		this._special = SPECIAL_STYLE;
	}
	this._state = TAG_NAME;
	this._index--; //consume the token again
};

_$[AFTER_STYLE_1] = ifElseStateIC("Y", AFTER_STYLE_2, DATA);
_$[AFTER_STYLE_2] = ifElseStateIC("L", AFTER_STYLE_3, DATA);
_$[AFTER_STYLE_3] = ifElseStateIC("E", AFTER_STYLE_4, DATA);

_$[AFTER_STYLE_4] = function(c){
	if(c === ">" || whitespace(c)){
		this._special = SPECIAL_NONE;
		this._state = IN_CLOSING_TAG_NAME;
		this._sectionStart = this._index - 5;
		this._index--; //reconsume the token
	}
	else this._state = DATA;
};

_$[BEFORE_ENTITY] = ifElseState("#", BEFORE_NUMERIC_ENTITY, IN_NAMED_ENTITY);
_$[BEFORE_NUMERIC_ENTITY] = ifElseStateIC("X", IN_HEX_ENTITY, IN_NUMERIC_ENTITY);

//for entities terminated with a semicolon
Tokenizer.prototype._parseNamedEntityStrict = function(){
	//offset = 1
	if(this._sectionStart + 1 < this._index){
		var entity = this._buffer.substring(this._sectionStart + 1, this._index),
		    map = this._xmlMode ? xmlMap : entityMap;

		if(map.hasOwnProperty(entity)){
			this._emitPartial(map[entity]);
			this._sectionStart = this._index + 1;
		}
	}
};


//parses legacy entities (without trailing semicolon)
Tokenizer.prototype._parseLegacyEntity = function(){
	var start = this._sectionStart + 1,
	    limit = this._index - start;

	if(limit > 6) limit = 6; //the max length of legacy entities is 6

	while(limit >= 2){ //the min length of legacy entities is 2
		var entity = this._buffer.substr(start, limit);

		if(legacyMap.hasOwnProperty(entity)){
			this._emitPartial(legacyMap[entity]);
			this._sectionStart += limit + 1;
			return;
		} else {
			limit--;
		}
	}
};

_$[IN_NAMED_ENTITY] = function(c){
	if(c === ";"){
		this._parseNamedEntityStrict();
		if(this._sectionStart + 1 < this._index && !this._xmlMode){
			this._parseLegacyEntity();
		}
		this._state = this._baseState;
	} else if((c < "a" || c > "z") && (c < "A" || c > "Z") && (c < "0" || c > "9")){
		if(this._xmlMode);
		else if(this._sectionStart + 1 === this._index);
		else if(this._baseState !== DATA){
			if(c !== "="){
				this._parseNamedEntityStrict();
			}
		} else {
			this._parseLegacyEntity();
		}

		this._state = this._baseState;
		this._index--;
	}
};

Tokenizer.prototype._decodeNumericEntity = function(offset, base){
	var sectionStart = this._sectionStart + offset;

	if(sectionStart !== this._index){
		//parse entity
		var entity = this._buffer.substring(sectionStart, this._index);
		var parsed = parseInt(entity, base);

		this._emitPartial(decodeCodePoint(parsed));
		this._sectionStart = this._index;
	} else {
		this._sectionStart--;
	}

	this._state = this._baseState;
};

_$[IN_NUMERIC_ENTITY] = function(c){
	if(c === ";"){
		this._decodeNumericEntity(2, 10);
		this._sectionStart++;
	} else if(c < "0" || c > "9"){
		if(!this._xmlMode){
			this._decodeNumericEntity(2, 10);
		} else {
			this._state = this._baseState;
		}
		this._index--;
	}
};

_$[IN_HEX_ENTITY] = function(c){
	if(c === ";"){
		this._decodeNumericEntity(3, 16);
		this._sectionStart++;
	} else if((c < "a" || c > "f") && (c < "A" || c > "F") && (c < "0" || c > "9")){
		if(!this._xmlMode){
			this._decodeNumericEntity(3, 16);
		} else {
			this._state = this._baseState;
		}
		this._index--;
	}
};

Tokenizer.prototype._cleanup = function () {
	if(this._sectionStart < 0){
		this._buffer = "";
		this._index = 0;
	} else if(this._running){
		if(this._state === DATA){
			if(this._sectionStart !== this._index){
				this._cbs.ontext(this._buffer.substr(this._sectionStart));
			}
			this._buffer = "";
			this._index = 0;
		} else if(this._sectionStart === this._index){
			//the section just started
			this._buffer = "";
			this._index = 0;
		} else {
			//remove everything unnecessary
			this._buffer = this._buffer.substr(this._sectionStart);
			this._index -= this._sectionStart;
		}

		this._sectionStart = 0;
	}
};

//TODO make events conditional
Tokenizer.prototype.write = function(chunk){
	if(this._ended) this._cbs.onerror(Error(".write() after done!"));

	this._buffer += chunk;
	this._parse();
};

Tokenizer.prototype._parse = function(){
	while(this._index < this._buffer.length && this._running){
		this[this._state](this._buffer.charAt(this._index));

		this._index++;
	}

	this._cleanup();
};

Tokenizer.prototype.pause = function(){
	this._running = false;
};
Tokenizer.prototype.resume = function(){
	this._running = true;

	if(this._index < this._buffer.length){
		this._parse();
	}
	if(this._ended){
		this._finish();
	}
};

Tokenizer.prototype.end = function(chunk){
	if(this._ended) this._cbs.onerror(Error(".end() after done!"));
	if(chunk) this.write(chunk);

	this._ended = true;

	if(this._running) this._finish();
};

Tokenizer.prototype._finish = function(){
	//if there is remaining data, emit it in a reasonable way
	if(this._sectionStart < this._index){
		this._handleTrailingData();
	}

	this._cbs.onend();
};

Tokenizer.prototype._handleTrailingData = function(){
	var data = this._buffer.substr(this._sectionStart);

	if(this._state === IN_CDATA || this._state === AFTER_CDATA_1 || this._state === AFTER_CDATA_2){
		this._cbs.oncdata(data);
	} else if(this._state === COMMENT || this._state === COMMENT_END_DASH || this._state === COMMENT_END){
		this._cbs.oncomment(data);
	} else if(this._state === IN_NAMED_ENTITY && !this._xmlMode){
		this._parseLegacyEntity();
		if(this._sectionStart < this._index){
			this._state = this._baseState;
			this._handleTrailingData();
		}
	} else if(this._state === IN_NUMERIC_ENTITY && !this._xmlMode){
		this._decodeNumericEntity(2, 10);
		if(this._sectionStart < this._index){
			this._state = this._baseState;
			this._handleTrailingData();
		}
	} else if(this._state === IN_HEX_ENTITY && !this._xmlMode){
		this._decodeNumericEntity(3, 16);
		if(this._sectionStart < this._index){
			this._state = this._baseState;
			this._handleTrailingData();
		}
	} else if(
		this._state !== TAG_NAME &&
		this._state !== BEFORE_ATTRIBUTE_NAME &&
		this._state !== BEFORE_ATTRIBUTE_VALUE &&
		this._state !== AFTER_ATTRIBUTE_NAME &&
		this._state !== ATTRIBUTE_NAME &&
		this._state !== ATTRIBUTE_VALUE_SQ &&
		this._state !== ATTRIBUTE_VALUE_DQ &&
		this._state !== ATTRIBUTE_VALUE_NQ &&
		this._state !== IN_CLOSING_TAG_NAME
	){
		this._cbs.ontext(data);
	}
	//else, ignore remaining data
	//TODO add a way to remove current tag
};

Tokenizer.prototype.reset = function(){
	Tokenizer.call(this, {xmlMode: this._xmlMode, decodeEntities: this._decodeEntities}, this._cbs);
};

Tokenizer.prototype._getSection = function(){
	return this._buffer.substring(this._sectionStart, this._index);
};

Tokenizer.prototype._getEndingSection = function(){
	var ret = this._getSection();
	this._sectionStart = -1;
	return ret;
};

Tokenizer.prototype._getPartialSection = function(){
	var ret = this._getSection();
	this._sectionStart = this._index + 1;
	return ret;
};

Tokenizer.prototype._emitPartial = function(value){
	if(this._baseState !== DATA){
		this._cbs.onattribdata(value); //TODO implement the new event
	} else {
		this._cbs.ontext(value);
	}
};
