module.exports = Tokenizer;

var decodeCodePoint = require("entities/lib/decode_codepoint.js"),
    entityMap = require("entities/maps/entities.json"),
    legacyMap = require("entities/maps/legacy.json"),
    xmlMap    = require("entities/maps/xml.json"),

    DATA                      = "DATA",
    TAG_OPEN                  = "TAG_OPEN", //after <
    TAG_NAME                  = "TAG_NAME",
    SELF_CLOSING_START_TAG    = "SELF_CLOSING_START_TAG",
    END_TAG_OPEN              = "END_TAG_OPEN",
    IN_CLOSING_TAG_NAME       = "IN_CLOSING_TAG_NAME",
    AFTER_CLOSING_TAG_NAME    = "AFTER_CLOSING_TAG_NAME",

    //attributes
    BEFORE_ATTRIBUTE_NAME     = "BEFORE_ATTRIBUTE_NAME",
    ATTRIBUTE_NAME            = "ATTRIBUTE_NAME",
    AFTER_ATTRIBUTE_NAME      = "AFTER_ATTRIBUTE_NAME",
    BEFORE_ATTRIBUTE_VALUE    = "BEFORE_ATTRIBUTE_VALUE",
    ATTRIBUTE_VALUE_DQ        = "ATTRIBUTE_VALUE_DQ", // "
    ATTRIBUTE_VALUE_SQ        = "ATTRIBUTE_VALUE_SQ", // '
    ATTRIBUTE_VALUE_NQ        = "ATTRIBUTE_VALUE_NQ",

    //comments
    MARKUP_DECLARATION_OPEN   = "MARKUP_DECLARATION_OPEN", // !
    BOGUS_COMMENT             = "BOGUS_COMMENT",
    BEFORE_COMMENT            = "BEFORE_COMMENT",
    COMMENT_START             = "COMMENT_START",
    COMMENT_START_DASH        = "COMMENT_START_DASH",
    COMMENT                   = "COMMENT",
    COMMENT_END_DASH          = "COMMENT_END_DASH",
    COMMENT_END               = "COMMENT_END",
    COMMENT_END_BANG          = "COMMENT_END_BANG",

    //cdata
    BEFORE_CDATA              = "BEFORE_CDATA",
    IN_CDATA                  = "IN_CDATA",
    AFTER_CDATA_1             = "AFTER_CDATA_1",  // ]
    AFTER_CDATA_2             = "AFTER_CDATA_2",  // ]

    //special tags
    BEFORE_SPECIAL            = "BEFORE_SPECIAL", //S
    BEFORE_SPECIAL_END        = "BEFORE_SPECIAL_END", //S
    BEFORE_SCRIPT             = "BEFORE_SCRIPT", //T
    AFTER_SCRIPT              = "AFTER_SCRIPT", //T
    BEFORE_STYLE              = "BEFORE_STYLE", //E
    AFTER_STYLE               = "AFTER_STYLE", //E

    BEFORE_ENTITY             = "BEFORE_ENTITY", //&
    BEFORE_NUMERIC_ENTITY     = "BEFORE_NUMERIC_ENTITY", //#
    IN_NAMED_ENTITY           = "IN_NAMED_ENTITY",
    IN_NUMERIC_ENTITY         = "IN_NUMERIC_ENTITY",
    IN_HEX_ENTITY             = "IN_HEX_ENTITY", //X

	BEFORE_DOCTYPE_NAME       = "BEFORE_DOCTYPE_NAME",
	DOCTYPE_NAME              = "DOCTYPE_NAME",
	AFTER_DOCTYPE_NAME        = "AFTER_DOCTYPE_NAME",
	AFTER_DT_PUBLIC           = "AFTER_DT_PUBLIC",
	BOGUS_EVIL_DOCTYPE        = "BOGUS_EVIL_DOCTYPE",
	BOGUS_DOCTYPE             = "BOGUS_DOCTYPE",
	AFTER_DT_SYSTEM           = "AFTER_DT_SYSTEM",
	DT_SYSTEM_DQ              = "DT_SYSTEM_DQ",
	DT_SYSTEM_SQ              = "DT_SYSTEM_SQ",
	DT_PUBLIC_DQ              = "DT_PUBLIC_DQ",
	DT_PUBLIC_SQ              = "DT_PUBLIC_SQ",
	DT_BETWEEN_PUB_SYS        = "DT_BETWEEN_PUB_SYS",
	AFTER_DT_SYSTEM_IDENT     = "AFTER_DT_SYSTEM_IDENT",

	SEQUENCE                  = "SEQUENCE",

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

function Tokenizer(options, cbs){
	this._state = DATA;
	this._buffer = "";
	this._sectionStart = 0;
	this._index = 0;
	this._baseState = DATA;
	this._nextState = DATA;
	this._sequence = "";
	this._special = SPECIAL_NONE;
	this._cbs = cbs;
	this._running = true;
	this._ended = false;
	this._xmlMode = !!(options && options.xmlMode);
	this._decodeEntities = !!(options && options.decodeEntities);
}

var _$ = Tokenizer.prototype;

Tokenizer.prototype._consumeSequence = function(seq, SUCCESS, FAILURE){
	this._sequence = seq;
	this._nextState = SUCCESS;
	this._baseState = FAILURE;
	this._state = SEQUENCE;
};

_$[SEQUENCE] = function(c){
	var comp = this._sequence.charAt(0);
	if(c === comp || c.toLowerCase() === comp){
		this._sequence = this._sequence.substr(1);
		if(this._sequence === ""){
			this._state = this._nextState;
		}
	} else {
		this._state = this._baseState;
		this._index--;
	}
};


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
		//ignored
		this._sectionStart = this._index + 1;
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
		this._consumeSequence("octype", BEFORE_DOCTYPE_NAME, BOGUS_COMMENT);
	} else if(c === "["){ //TODO check context?
		this._consumeSequence("CDATA", BEFORE_CDATA, BOGUS_COMMENT);
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

// Ignored: 8.2.4.52 DOCTYPE state - parse error when whitespace missing (<!DOCTYPEfoo>)

// 8.2.4.53 Before DOCTYPE name state
_$[BEFORE_DOCTYPE_NAME] = function(c){
	if(whitespace(c));
	else if(c === ">"){
		this._cbs.ondoctypename("");
		this._cbs.ondtquirksend();
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
		this._cbs.ondoctypename(this._getEndingSection());
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
	} else if(c === "P" || c === "p"){
		this._consumeSequence("ublic", AFTER_DT_PUBLIC, BOGUS_EVIL_DOCTYPE);
	} else if(c === "S" || c === "s"){
		this._consumeSequence("ystem", AFTER_DT_SYSTEM, BOGUS_EVIL_DOCTYPE);
	} else {
		this._state = BOGUS_EVIL_DOCTYPE;
	}
};

// 8.2.4.56 After DOCTYPE public keyword state
// Ignored 8.2.4.57 Before DOCTYPE public identifier state

_$[AFTER_DT_PUBLIC] = function(c){
	if(whitespace(c));
	else if(c === ">"){
		this._sectionStart = this._index + 1;
		this._state = DATA;
	} else if(c === "\""){
		this._state = DT_PUBLIC_DQ;
		this._sectionStart = this._index + 1;
	} else if(c === "'"){
		this._state = DT_PUBLIC_SQ;
		this._sectionStart = this._index + 1;
	} else {
		this._state = BOGUS_EVIL_DOCTYPE;
	}
};

function doctypeQuotedState(quot, name, NEXT){
	return function(c){
		if(c === quot){
			this._cbs[name](this._getEndingSection());
			this._state = NEXT;
		} else if(c === ">"){
			// parse error
			this._cbs.ondoctypename(this._getPartialSection());
			this._cbs.ondtquirksend();
			this._state = DATA;
		}
	};
}

// 8.2.4.58 DOCTYPE public identifier (double-quoted) state
// 8.2.4.59 DOCTYPE public identifier (single-quoted) state

_$[DT_PUBLIC_DQ] = doctypeQuotedState("\"", "ondoctypepublic", DT_BETWEEN_PUB_SYS);
_$[DT_PUBLIC_SQ] = doctypeQuotedState("'",  "ondoctypepublic", DT_BETWEEN_PUB_SYS);

// Ignored 8.2.4.60 After DOCTYPE public identifier state
// 8.2.4.61 Between DOCTYPE public and system identifiers state

_$[DT_BETWEEN_PUB_SYS] = function(c){
	if(whitespace(c));
	else if(c === ">"){
		this._sectionStart = this._index + 1;
		this._state = DATA;
	} else if(c === "\""){
		this._state = DT_SYSTEM_DQ;
		this._sectionStart = this._index + 1;
	} else if(c === "'"){
		this._state = DT_SYSTEM_SQ;
		this._sectionStart = this._index + 1;
	} else {
		this._state = BOGUS_EVIL_DOCTYPE;
	}
};

// 8.2.4.62 After DOCTYPE system keyword state
// Ignored 8.2.4.63 Before DOCTYPE system identifier state

_$[AFTER_DT_SYSTEM] = function(c){
	if(whitespace(c));
	else if(c === ">"){
		this._sectionStart = this._index + 1;
		this._state = DATA;
	} else if(c === "\""){
		this._state = DT_SYSTEM_DQ;
		this._sectionStart = this._index + 1;
	} else if(c === "'"){
		this._state = DT_SYSTEM_SQ;
		this._sectionStart = this._index + 1;
	} else {
		this._state = BOGUS_EVIL_DOCTYPE;
	}
};

// 8.2.4.64 DOCTYPE system identifier (double-quoted) state
// 8.2.4.65 DOCTYPE system identifier (single-quoted) state

_$[DT_SYSTEM_DQ] = doctypeQuotedState("\"", "ondoctypesystem", AFTER_DT_SYSTEM_IDENT);
_$[DT_SYSTEM_SQ] = doctypeQuotedState("'",  "ondoctypesystem", AFTER_DT_SYSTEM_IDENT);

// 8.2.4.66 After DOCTYPE system identifier state

_$[AFTER_DT_SYSTEM_IDENT] = function(){
	this._cbs.ondoctypeend();
	this._state = BOGUS_DOCTYPE;
	this._index--;
};

//helper for sequences
_$[BOGUS_EVIL_DOCTYPE] = function(){
	this._cbs.ondtquirksend();
	this._state = BOGUS_DOCTYPE;
	this._index--;
};

// 8.2.4.67 Bogus DOCTYPE state

_$[BOGUS_DOCTYPE] = function(c){
	if(c === ">"){
		this._sectionStart = this._index + 1;
		this._state = DATA;
	}
};

_$[BEFORE_CDATA] = function(c){
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
		this._consumeSequence("ript", BEFORE_SCRIPT, TAG_NAME);
	} else if(c === "t" || c === "T"){
		this._consumeSequence("yle", BEFORE_STYLE, TAG_NAME);
	} else {
		this._state = TAG_NAME;
		this._index--; //consume the token again
	}
};

_$[BEFORE_SPECIAL_END] = function(c){
	if(this._special === SPECIAL_SCRIPT && (c === "c" || c === "C")){
		this._consumeSequence("ript", AFTER_SCRIPT, DATA);
	} else if(this._special === SPECIAL_STYLE && (c === "t" || c === "T")){
		this._consumeSequence("yle", AFTER_STYLE, DATA);
	}
	else this._state = DATA;
};

_$[BEFORE_SCRIPT] = function(c){
	if(c === "/" || c === ">" || whitespace(c)){
		this._special = SPECIAL_SCRIPT;
	}
	this._state = TAG_NAME;
	this._index--; //consume the token again
};

_$[AFTER_SCRIPT] = function(c){
	if(c === ">" || whitespace(c)){
		this._special = SPECIAL_NONE;
		this._state = IN_CLOSING_TAG_NAME;
		this._sectionStart = this._index - 6;
		this._index--; //reconsume the token
	}
	else this._state = DATA;
};

_$[BEFORE_STYLE] = function(c){
	if(c === "/" || c === ">" || whitespace(c)){
		this._special = SPECIAL_STYLE;
	}
	this._state = TAG_NAME;
	this._index--; //consume the token again
};

_$[AFTER_STYLE] = function(c){
	if(c === ">" || whitespace(c)){
		this._special = SPECIAL_NONE;
		this._state = IN_CLOSING_TAG_NAME;
		this._sectionStart = this._index - 5;
		this._index--; //reconsume the token
	}
	else this._state = DATA;
};

_$[BEFORE_ENTITY] = function(c){
	if(c === "#"){
		this._state = BEFORE_NUMERIC_ENTITY;
	} else {
		this._state = IN_NAMED_ENTITY;
		this._index--;
	}
};

_$[BEFORE_NUMERIC_ENTITY] = function(c){
	if(c === "x" || c === "X"){
		this._state = IN_HEX_ENTITY;
	} else {
		this._state = IN_NUMERIC_ENTITY;
		this._index--;
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

Tokenizer.prototype.write = function(chunk){
	if(this._ended) this._cbs.onerror(Error(".write() after done!"));

	this._buffer += chunk;
	this._parse();
};

Tokenizer.prototype._parse = function(){
	while(
		this._index < this._buffer.length && this._running
	){
		//TODO re-add giant branch tree
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
	} else if(
		this._state === COMMENT ||
		this._state === COMMENT_END_DASH ||
		this._state === COMMENT_END ||
		this._state === BOGUS_COMMENT ||
		this._state === COMMENT_START ||
		this._state === COMMENT_END_BANG
	){
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
