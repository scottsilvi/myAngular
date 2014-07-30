/* jshint globalstrict: true */
'use strict';

var _ = require('lodash');

var ESCAPES = {'n':'\n', 'f':'\f', 'r':'\r', 't':'\t', 'v':'\v', '\'':'\'', '"':'"'};
var OPERATORS = {
	'null' : _.constant(null),
	'true' : _.constant(true),
	'false' : _.constant(false)
};

function parse(expr) {
	var lexer = new Lexer();
	var parser = new Parser(lexer);
	return parser.parse(expr);
};

function Lexer () {

};

Lexer.prototype.lex = function (text) {
	this.text = text;
	this.index = 0;
	this.ch = undefined;
	this.tokens = [];

	while (this.index < this.text.length) {
		this.ch = this.text.charAt(this.index);

		if (this.isNumber(this.ch) ||
			(this.ch === '.' && this.isNumber(this.peek()))) {
			this.readNumber();
		} else if (this.ch === '\'' || this.ch === '"') {
			this.readString(this.ch);
		} else if (this.ch === '[' || this.ch === ']' || this.ch === ',') {
			this.tokens.push({
				text: this.ch,
				json: true
			});
			this.index++;
		} else if (this.isIdent(this.ch)) {
			this.readIdent();
		} else if (this.isWhitespace(this.ch)) {
			this.index++;
		} else {
			throw 'unexpected next character: ' + this.ch;
		}
	}

	return this.tokens;
};

Lexer.prototype.isNumber = function (ch) {
	return '0' <= ch && ch <= '9';
};

Lexer.prototype.readNumber = function () {
	var number = '';
	while (this.index < this.text.length) {
		var ch = this.text.charAt(this.index).toLowerCase();
		if (ch === '.' || this.isNumber(ch)) {
			number += ch;
		} else {
			var nextCh = this.peek();
			var prevCh = number.charAt(number.length - 1);
			if(ch === 'e' && this.isExpOperator(nextCh)) {
				number += ch;
			} else if (this.isExpOperator(ch) && prevCh === 'e' && nextCh && this.isNumber(nextCh)) {
				number += ch;
			} else if (this.isExpOperator(ch) && prevCh === 'c' && (!nextCh || !this.isNumber(nextCh))) {
				throw "Invalid Exponent";
			} else {
				break;
			}
		}
		this.index++;
	}

	number = 1 * number;
	this.tokens.push({
		text: number, 
		fn: _.constant(number),
		json: true
	});
};

Lexer.prototype.readString = function (quote) {
	this.index++;
	var rawString = quote;
	var string = '';
	var escape = false;
	while (this.index < this.text.length) {
		var ch = this.text.charAt(this.index);
		rawString += ch;

		if (escape) {
			if(ch === 'u') {
				var hex = this.text.substring(this.index + 1, this.index + 5);
				if(!hex.match(/[\da-f]{4}/i)) {
					throw 'Invalid unicode escape';
				}
				this.index += 4;
				string = String.fromCharCode(parseInt(hex, 16));
			} else {
				var replacement = ESCAPES[ch];
				if(replacement) {
					string += replacement;
				} else {
					string += ch;
				}
			}
			escape = false;
		} else if (ch === quote) {
			this.index++;
			this.tokens.push({
				text: rawString,
				fn: _.constant(string), 
				json: true
			});
			return;
		} else if (ch === '\\') {
			escape = true;
		} else {
			string += ch;
		}
		this.index++;
	}
	throw 'Unmatched quote';
};

Lexer.prototype.readIdent = function () {
	var text = '';
	while (this.index < this.text.length) {
		var ch = this.text.charAt(this.index);
		if(this.isIdent(ch) || this.isNumber(ch)) {
			text += ch;
		} else {
			break;
		}
		this.index++;
	}
	var token = {
		text: text
	};
	if(OPERATORS.hasOwnProperty(text)) {
		token.fn = OPERATORS[text];
		token.json = true;
	}
	this.tokens.push(token);
};

Lexer.prototype.peek = function () {
	return this.index < this.text.length - 1 ?
		this.text.charAt(this.index + 1) :
		false;
};

Lexer.prototype.isExpOperator = function (ch) {
	return ch === '-' || ch === '+' || this.isNumber(ch);
};

Lexer.prototype.isIdent = function (ch) {
	return (ch >= 'a' && ch <= 'z')  || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$';
};

Lexer.prototype.isWhitespace = function (ch) {
	return (ch === ' ' || ch === '\r' || ch === '\t' || ch === '\n' || ch === '\v' || ch === '\u00A0');
};

function Parser(lexer) {
	this.lexer = lexer;
};

Parser.prototype.parse = function (text) {
	this.tokens = this.lexer.lex(text);
	return this.primary();
};

Parser.prototype.primary = function () {
	var primary;
	if(this.expect('[')) {
		primary = this.arrayDeclaration();
	} else {
		var token = this.expect();
		var primary = token.fn;
		if (token.json) {
			primary.constant = true;
			primary.literal = true;
		}
	}
	return primary;
};

Parser.prototype.expect = function (e) {
	var token = this.peek(e);
	if(token) {
		return this.tokens.shift();
	}
};

Parser.prototype.arrayDeclaration = function () {
	var elementFns = [];
	if(!this.peek(']')) {
		do {
			if(this.peek(']')) {
				break;
			}
			elementFns.push(this.primary());
		} while (this.expect(','));
	}
	this.consume(']');
	var arrayFn = function () {
		return _.map(elementFns, function (elementFn) {
			return elementFn();
		});
	}
	arrayFn.literal = true;
	arrayFn.constant = true;
	return arrayFn;
};

Parser.prototype.consume = function (e) {
	if(!this.expect(e)) {
		throw 'Unexpected. Expecting ' + e;
	}
};

Parser.prototype.peek = function (e) {
	if (this.tokens.length > 0) {
		var text = this.tokens[0].text;
		if (text === e || !e) {
			return this.tokens[0];
		}
	}
};
module.exports = parse;
