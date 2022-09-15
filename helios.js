//@ts-check
///////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////    Helios   //////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
//
// Author:      Christian Schmitz
// Email:       cschmitz398@gmail.com
// Website:     github.com/hyperion-bt/helios
// Version:     0.5.3
// Last update: September 2022
// License:     Unlicense
//
//
// About: Helios is a smart contract DSL for Cardano. 
//     This Javascript library contains functions to compile Helios sources into Plutus-Core.
//     Transactions can also be generated using Helios.
//
//     
// Dependencies: none
//
//
// Disclaimer: I made Helios available as FOSS so that the Cardano community can test 
//     it extensively. I don't guarantee the library is bug-free, 
//     nor do I guarantee backward compatibility with future versions.
//
//
// Example usage:
//     > import * as helios from "helios.js";
//     > console.log(helios.Program.new("validator my_validator ...").compile().serialize());
//
//
// Exports:
//   * Program
//   	Helios program object. 
//       	* Program.new(src: string) -> Program
//         	* program.compile(simplify: boolean = false) -> PlutusCoreProgram
//       	* program.paramTypes -> Object.<name: string, type: Type>
//       	* program.changeParam(name: string, value: string | PlutusCoreValue)
//              value can be a valid JSON string or a PlutusCoreValue result from program.evalParam()
//       	* program.evalParam(name: string) -> PlutusCoreValue  
//          	result can be used as an arg when running a PlutusCoreProgram
//
//   * PlutusCoreProgram
//		Plutus-Core program object
//      	* async program.run(args: PlutusCoreValue[]) -> PlutusCoreValue | UserError
//          * async program.profile(args: PlutusCoreValue[]) -> {mem: number, cpu: number, size: number}
//          * program.serialize() -> string
//          	json string which can be used as a file by cardano-cli to submit a transaction
//		
//   * UserError
//       Special error object used for syntax, type, reference and runtime errors.
//       Contains a reference to the script location were the error occured.
//
//   * FuzzyTest(seed: number)
//       Fuzzy testing class which can be used for propery based testing of test scripts.
//       See ./test-suite.js for examples of how to use this.
//
//   * extractScriptPurposeAndName(src: string) -> [string, string]
//       Parses Helios quickly to extract the script purpose header.
//
//   * highlight(src: string) -> Uint8Array
//       Returns one marker byte per src character.
//
//   * Tx
//       Tx class which can also be used for building transactions.
//
//
// Note: the Helios library is a single file, doesn't use TypeScript, and should stay 
//     unminified (so that a unique git commit of this repo is directly related to a unique IPFS 
//     address of 'helios.js').
//
//
// Overview of internals:
//     1. Global constants and vars         VERSION, DEBUG, debug, BLAKE2B_DIGEST_SIZE, 
//                                          setBlake2bDigestSize, TAB, ScriptPurpose, 
//                                          PLUTUS_CORE_VERSION_COMPONENTS, PLUTUS_CORE_VERSION, 
//                                          PLUTUS_SCRIPT_VERSION, PLUTUS_CORE_TAG_WIDTH, 
//                                          PLUTUS_CORE_DATA_NODE_MEM_SIZE
//
//     2. Utilities                         assert, assertDefined, equals, assertEq, idiv, ipow2, 
//                                          imask, imod32, imod8, posMod, irotr, bigIntToBytes, 
//                                          bytesToBigInt, padZeroes, byteToBitString, hexToBytes, 
//                                          bytesToHex, stringToBytes, bytesToString, replaceTabs, 
//                                          unwrapCBORBytes, wrapCBORBytes, BitReader, BitWriter, 
//                                          UInt64, DEFAULT_BASE32_ALPHABET, BECH32_BASE32_ALPHABET, 
//                                          Crypto, IR, Source, UserError, Site
//
//     3. Plutus-Core builtins              NetworkParams, 
//                                          CostModel, ConstCost, LinearCost, ArgSizeCost, 
//                                          MinArgSizeCost, MaxArgSizeCost, SumArgSizesCost,
//                                          ArgSizeDiffCost, ArgSizeProdCost, ArgSizeDiagCost,
//                                          PlutusCoreBuiltinInfo, PLUTUS_CORE_BUILTINS
//
//     4. Plutus-Core AST objects           PlutusCoreValue, DEFAULT_PLUTUS_CORE_RTE_CALLBACKS,
//                                          PlutusCoreRTE, PlutusCoreStack, 
//                                          PlutusCoreAnon, PlutusCoreInt, PlutusCoreByteArray, 
//                                          PlutusCoreString, PlutusCoreUnit, PlutusCoreBool,
//                                          PlutusCorePair, PlutusCoreMapItem, PlutusCoreList, 
//                                          PlutusCoreMap, PlutusCoreDataValue, PlutusCoreTerm, 
//                                          PlutusCoreVariable, PlutusCoreDelay, PlutusCoreLambda, 
//                                          PlutusCoreCall, PlutusCoreConst, PlutusCoreForce, 
//                                          PlutusCoreError, PlutusCoreBuiltin, PlutusCoreProgram
//
//     5. Plutus-Core data objects          CBORData, PlutusCoreData, IntData, ByteArrayData, 
//                                          ListData, MapData, ConstrData
//
//     6. Token objects                     Token, Word, Symbol, Group, 
//                                          PrimitiveLiteral, IntLiteral, BoolLiteral, 
//                                          ByteArrayLiteral, StringLiteral, UnitLiteral
//
//     7. Tokenization                      Tokenizer, tokenize, tokenizeIR, getPurposeName,
//                                          extractScriptPurposeAndName, SyntaxCategory, highlight
//
//     8. Type evaluation objects           GeneralizedValue, Type, AnyType, DataType, AnyDataType, 
//                                          BuiltinType, BuiltinEnumMember, 
//                                          StatementType, FuncType, Value, DataValue, 
//                                          FuncValue, FuncStatementValue
//
//     9. Scopes                            GlobalScope, Scope, TopScope, FuncStatementScope
//
//    10. AST expression objects            Expr, TypeExpr, TypeRefExpr, TypePathExpr, 
//                                          ListTypeExpr, MapTypeExpr, OptionTypeExpr, 
//                                          FuncTypeExpr, ValueExpr, AssignExpr, PrintExpr, 
//                                          PrimitiveLiteralExpr, StructLiteralField, 
//                                          StructLiteralExpr, ListLiteralExpr, MapLiteralExpr, 
//                                          NameTypePair, FuncArg, FuncLiteralExpr, ValueRefExpr, 
//                                          ValuePathExpr, UnaryExpr, BinaryExpr, ParensExpr, 
//                                          CallExpr, MemberExpr, IfElseExpr, 
//                                          SwitchCase, SwitchDefault, SwitchExpr
//
//    11. AST statement objects             Statement, ConstStatement, DataField, 
//                                          DataDefinition, StructStatement, FuncStatement, 
//                                          EnumMember, EnumStatement, ImplDefinition,
//                                          Program, RedeemerProgram, DatumRedeemerProgram,
//                                          TestingProgram, SpendingProgram, MintingProgram,
//                                          StakingProgram
//
//    12. AST build functions               buildProgramStatements, buildScriptPurpose, 
//                                          buildConstStatement, 
//                                          splitDataImpl, buildStructStatement, buildDataFields,
//                                          buildFuncStatement, buildFuncLiteralExpr, buildFuncArgs,
//                                          buildEnumStatement, buildEnumMember, 
//                                          buildImplDefinition, buildImplMembers, buildTypeExpr, 
//                                          buildListTypeExpr, buildMapTypeExpr, 
//                                          buildOptionTypeExpr, buildFuncTypeExpr, 
//                                          buildTypePathExpr, buildTypeRefExpr, 
//                                          buildValueExpr, buildMaybeAssignOrPrintExpr, 
//                                          makeBinaryExprBuilder, makeUnaryExprBuilder, 
//                                          buildChainedValueExpr, buildChainStartValueExpr, 
//                                          buildCallArgs, buildIfElseExpr, buildSwitchExpr, 
//                                          buildSwitchCase, buildSwitchDefault, 
//                                          buildListLiteralExpr, buildMapLiteralExpr, 
//                                          buildStructLiteralExpr, buildStructLiteralField, 
//                                          buildValuePathExpr, buildLiteralExprFromJSON,
//                                          buildLiteralExprFromValue
//
//    13. Builtin types                     IntType, BoolType, StringType, ByteArrayType, 
//                                          ListType, FoldListFuncValue, MapListFuncValue,
//                                          MapType, FoldMapFuncValue,
//                                          OptionType, OptionSomeType, OptionNoneType,
//                                          HashType, PubKeyHashType, ValidatorHashType, 
//                                          MintingPolicyHashType, DatumHashType, 
//                                          ScriptContextType, StakingPurposeType,
//                                          StakingRewardingPurposeType, StakingCertifyingPurposeType,
//                                          DCertType, RegisterDCertType, DeregisterDCertType,
//                                          DelegateDCertType, RegisterPoolDCertType,
//                                          RetirePoolDCertType, TxType, TxIdType, TxInputType, 
//                                          TxOutputType, OutputDatumType, OutputDatumNoneType,
//                                          OutputDatumHashType, OutputDatumInlineType,
//                                          RawDataType, TxOutputIdType, AddressType, 
//                                          CredentialType, CredentialPubKeyType, 
//                                          CredentialValidatorType, StakingCredentialType, 
//                                          StakingHashCredentialType, StakingPtrCredentialType, 
//                                          TimeType, DurationType, TimeRangeType, 
//                                          AssetClassType, MoneyValueType
//
//    14. Builtin low-level functions       onNotifyRawUsage, setRawUsageNotifier, 
//                                          RawFunc, makeRawFunctions, wrapWithRawFunctions
//
//    15. IR AST objects                    IRScope, IRExprStack, IRValue, IRFuncValue, 
//                                          IRLiteralValue, IRCallStack, IRVariable, IRExpr,
//                                          IRNameExpr, IRLiteral, IRFuncExpr, IRCallExpr, 
//                                          IRUserCallExpr, IRCoreCallExpr, IRErrorCallExpr,
//                                          IRProgram
//
//    16. IR AST build functions            buildIRExpr, buildIRFuncExpr
//     
//    17. Plutus-Core deserialization       PlutusCoreDeserializer, deserializePlutusCoreBytes, 
//                                          deserializePlutusCore
//
//    18. Transaction objects               Tx, TxBody, TxWitnesses, TxInput, TxOutput, DCert, 
//                                          Address, MultiAsset, MoneyValue, Hash, PubKeyWitness, 
//                                          Redeemer, SpendingRedeemer, MintingRedeemer, 
//                                          OutputDatum, OutputDatumHash, OutputDatumInline
//
//    19. Property test framework           FuzzyTest
//
///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////


///////////////////////////////////////
// Section 1: Global constants and vars
///////////////////////////////////////

export const VERSION = "0.5.3"; // don't forget to change to version number at the top of this file, and in package.json

var DEBUG = false;

/**
 * Changes the value of DEBUG
 * @param {boolean} b
 */
function debug(b) { DEBUG = b };

var BLAKE2B_DIGEST_SIZE = 32; // bytes

/**
 * Changes the value of BLAKE2B_DIGEST_SIZE (because nodjes crypto module only supports blake2b-512 and not blake2b-256, 
 *  and we want to avoid non-standard dependencies in the test-suite)
 * @param {number} s - 32 or 64
 */
function setBlake2bDigestSize(s) {
	BLAKE2B_DIGEST_SIZE = s;
}

/**
 * A tab used for indenting of the IR.
 * 4 spaces.
 * @type {string}
 */
const TAB = "    ";

/**
 * A Helios Program can have different purposes
 */
const ScriptPurpose = {
	Testing: -1,
	Minting: 0,
	Spending: 1,
	Staking: 2,
};

/**
 * This library uses version "1.0.0" of Plutus-Core
 */
const PLUTUS_CORE_VERSION_COMPONENTS = [1n, 0n, 0n];

/**
 * i.e. "1.0.0"
 * @type {string}
 */
const PLUTUS_CORE_VERSION = PLUTUS_CORE_VERSION_COMPONENTS.map(c => c.toString()).join(".");

/**
 * This library uses V2 of the Plutus Ledger API, and is no longer compatible with V1
 */
const PLUTUS_SCRIPT_VERSION = "PlutusScriptV2";

/**
 * @type {Object.<string, number>}
 */
const PLUTUS_CORE_TAG_WIDTHS = {
	term:      4,
	type:      3,
	constType: 4,
	builtin:   7,
	constant:  4,
	kind:      1,
};

/**
 * @typedef {Object} Cost
 * @property {bigint} mem
 * @property {bigint} cpu
 */

/**
 * Min memory used by a PlutusCoreData value during validation
 * @type {number}
 */
const PLUTUS_CORE_DATA_NODE_MEM_SIZE = 4;


///////////////////////
// Section 2: Utilities
///////////////////////

/**
 * Throws an error if 'cond' is false.
 * @param {boolean} cond 
 * @param {string} msg 
 */
function assert(cond, msg = "unexpected") {
	if (!cond) {
		throw new Error(msg);
	}
}

/**
 * Throws an error if 'obj' is undefined. Returns 'obj' itself (for chained application).
 * @template T
 * @param {T | undefined} obj 
 * @param {string} msg 
 * @returns {T}
 */
function assertDefined(obj, msg = "unexpected undefined value") {
	if (obj === undefined || obj === null ) {
		throw new Error(msg);
	}

	return obj;
}

/**
 * @param {any} obj 
 * @param {string} msg 
 * @returns {number}
 */
function assertNumber(obj, msg = "expected a number") {
	if (obj === undefined || obj === null) {
		throw new Error(msg);
	} else if (typeof obj == "number") {
		return obj;
	} else {
		throw new Error(msg);
	}
}

/**
 * Compares two objects (deep recursive comparison)
 * @template T
 * @param {T} a 
 * @param {T} b 
 * @returns {boolean}
 */
function equals(a, b) {
	if (a === undefined || b === undefined) {
		throw new Error("one of the args is undefined");
	} else if (typeof a == "string") {
		return a === b;
	} else if (typeof a == "number") {
		return a === b;
	} else if (typeof a == "boolean") {
		return a === b;
	} else if (typeof a == "bigint") {
		return a === b;
	} else if (a instanceof Array && b instanceof Array) {
		if (a.length != b.length) {
			return false;
		}

		for (let i = 0; i < a.length; i++) {
			if (!equals(a[i], b[i])) {
				return false;
			}
		}

		return true;
	} else {
		throw new Error("eq not yet implemented for these types");
	}
}

/**
 * Throws an error if two object aren't equal (deep comparison).
 * Used by unit tests that are autogenerated from JSDoc inline examples.
 * @template T
 * @param {T} a
 * @param {T} b
 * @param {string} msg
 */
function assertEq(a, b, msg) {
	if (!equals(a, b)) {
		console.log(a);
		console.log(b);
		throw new Error(msg);
	}
}

/**
 * Divides two integers. Assumes a and b are whole numbers. Rounds down the result.
 * @example
 * idiv(355, 113) => 3
 * @param {number} a
 * @param {number} b 
 * */
function idiv(a, b) {
	return Math.floor(a / b);
	// alternatively: (a - a%b)/b
}

/**
 * 2 to the power 'p' for bigint.
 * @param {bigint} p
 * @returns {bigint}
 */
function ipow2(p) {
	return (p <= 0n) ? 1n : 2n << (p - 1n);
}

/**
 * Masks bits of 'b' by setting bits outside the range ['i0', 'i1') to 0. 
 * 'b' is an 8 bit integer (i.e. number between 0 and 255).
 * The return value is also an 8 bit integer, shift right by 'i1'.
 * @example
 * imask(0b11111111, 1, 4) => 0b0111 // (i.e. 7)
 * @param {number} b 
 * @param {number} i0 
 * @param {number} i1 
 * @returns {number}
 */
function imask(b, i0, i1) {
	assert(i0 < i1);

	const mask_bits = [
		0b11111111,
		0b01111111,
		0b00111111,
		0b00011111,
		0b00001111,
		0b00000111,
		0b00000011,
		0b00000001,
	];

	return (b & mask_bits[i0]) >> (8 - i1);
}

/**
 * Make sure resulting number fits in uint32
 * @param {number} x
 */
function imod32(x) {
	return x >>> 0;
}

/**
 * Make sure resulting number fits in uint8
 * @param {number} x
 */
function imod8(x) {
	return x & 0xff;
}

/**
 * @param {bigint} x 
 * @param {bigint} n 
 * @returns {bigint}
 */
function posMod(x, n) {
	let res = x % n;
	if (res < 0n) {
		return res + n;
	} else {
		return res;
	}
}

/**
 * 32 bit number rotation
 * @param {number} x - originally uint32
 * @param {number} n
 * @returns {number} - originally uint32
 */
function irotr(x, n) {
	return imod32((x >>> n) | (x << (32 - n)));
}

/**
 * Converts an unbounded integer into a list of uint8 numbers (big endian)
 * Used by the CBOR encoding of data structures, and by Ed25519
 * @param {bigint} x
 * @returns {number[]}
 */
function bigIntToBytes(x) {
	if (x == 0n) {
		return [0];
	} else {
		/**
		 * @type {number[]}
		 */
		let res = [];

		while (x > 0n) {
			res.unshift(Number(x%256n));

			x = x/256n;
		}

		return res;
	}
}

/**
 * Converts a list of uint8 numbers into an unbounded int (big endian)
 * Used by the CBOR decoding of data structures.
 * @param {number[]} b
 * @return {bigint}
 */
function bytesToBigInt(b) {
	let s = 1n;

	let total = 0n;
	while (b.length > 0) {
		total += BigInt(assertDefined(b.pop()))*s;

		s *= 256n;
	}

	return total;
}

/**
 * Prepends zeroes to a bit-string so that 'result.length == n'.
 * @example
 * padZeroes("1111", 8) => "00001111"
 * @param {string} bits
 * @param {number} n 
 * @returns {string}
 */
function padZeroes(bits, n) {
	// padded to multiple of n
	if (bits.length % n != 0) {
		let nPad = n - bits.length % n;
		bits = (new Array(nPad)).fill('0').join('') + bits;
	}

	return bits;
}

/**
 * Converts a 8 bit integer number into a bit string with a "0b" prefix.
 * The result is padded with leading zeroes to become 'n' chars long ('2 + n' chars long if you count the "0b" prefix). 
 * @example
 * byteToBitString(7) => "0b00000111"
 * @param {number} b 
 * @param {number} n 
 * @returns {string}
 */
function byteToBitString(b, n = 8) {
	let s = padZeroes(b.toString(2), n);

	return "0b" + s;
}

/**
 * Converts a hexadecimal representation of bytes into an actual list of uint8 bytes.
 * @example
 * hexToBytes("00ff34") => [0, 255, 52] 
 * @param {string} hex 
 * @returns {number[]}
 */
export function hexToBytes(hex) {
	let bytes = [];

	for (let i = 0; i < hex.length; i += 2) {
		bytes.push(parseInt(hex.slice(i, i + 2), 16));
	}

	return bytes;
}

/**
 * Converts a list of uint8 bytes into its hexadecimal string representation.
 * @example
 * bytesToHex([0, 255, 52]) => "00ff34"
 * @param {number[]} bytes
 * @returns {string}
 */
export function bytesToHex(bytes) {
	let parts = [];
	for (let b of bytes) {
		parts.push(padZeroes(b.toString(16), 2));
	}

	return parts.join('');
}

/**
 * Encodes a string into a list of uint8 bytes using UTF-8 encoding.
 * @example
 * stringToBytes("hello world") => [104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100]
 * @param {string} str 
 * @returns {number[]}
 */
function stringToBytes(str) {
	return Array.from((new TextEncoder()).encode(str));
}

/**
 * Decodes a list of uint8 bytes into a string using UTF-8 encoding.
 * @example
 * bytesToString([104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100]) => "hello world"
 * @param {number[]} bytes 
 * @returns {string}
 */
function bytesToString(bytes) {
	return (new TextDecoder("utf-8", {fatal: true})).decode((new Uint8Array(bytes)).buffer);
}

/**
 * Replaces the tab characters of a string with spaces.
 * This is used to create a prettier IR (which is built-up from many template js strings in this file, which might contain tabs depending on the editor used)
 * @example
 * replaceTabs("\t\t\t") => [TAB, TAB, TAB].join("")
 * @param {string} str 
 * @returns {string}
 */
function replaceTabs(str) {
	return str.replace(new RegExp("\t", "g"), TAB);
}

/**
 * Unwraps cbor byte arrays. Returns a list of uint8 bytes without the cbor tag.
 * This function unwraps one level, so must be called twice to unwrap the text envelopes of plutus scripts.
 *  (for some reason the text envelopes is cbor wrapped in cbor)
 * @example
 * bytesToHex(unwrapCBORBytes(hexToBytes("4e4d01000033222220051200120011"))) => "4d01000033222220051200120011"
 * @param {number[]} bytes 
 * @returns {number[]}
 */
function unwrapCBORBytes(bytes) {
	if (bytes.length == 0) {
		throw new Error("expected at least one cbor byte");
	}

	return CBORData.decodeBytes(bytes);
}

/**
 * Wraps byte arrays with a cbor tag so they become valid cbor byte arrays.
 * Roughly the inverse of unwrapCBORBytes.
 * @example
 * bytesToHex(wrapCBORBytes(hexToBytes("4d01000033222220051200120011"))) => "4e4d01000033222220051200120011"
 * @param {number[]} bytes 
 * @returns {number[]}
 */
function wrapCBORBytes(bytes) {
	return CBORData.encodeBytes(bytes, false);
}

/**
 * Read non-byte aligned numbers
 */
 class BitReader {
	#view;
	#pos;
	#truncate;

	/**
	 * @param {number[]} bytes
	 * @param {boolean} truncate - if true then read last bits as low part of number, if false pad with zero bits
	 */
	constructor(bytes, truncate = true) {
		this.#view = new Uint8Array(bytes);
		this.#pos = 0; // bit position, not byte position
		this.#truncate = truncate;
	}

	/**
	 * @returns {boolean}
	 */
	eof() {
		return idiv(this.#pos, 8) >= this.#view.length;
	}

	/**
	 * Reads a number of bits (<= 8) and returns the result as an unsigned number
	 * @param {number} n - number of bits to read
	 * @returns {number}
	 */
	readBits(n) {
		assert(n <= 8, "reading more than 1 byte");

		let leftShift = 0;
		if (this.#pos + n > this.#view.length * 8) {
			let newN = (this.#view.length*8 - this.#pos);

			if (!this.#truncate) {
				leftShift = n - newN;
			}

			n = newN;
		}

		assert(n > 0, "eof");

		// it is assumed we don't need to be at the byte boundary

		let res = 0;
		let i0 = this.#pos;

		for (let i = this.#pos + 1; i <= this.#pos + n; i++) {
			if (i % 8 == 0) {
				let nPart = i - i0;

				res += imask(this.#view[idiv(i, 8) - 1], i0 % 8, 8) << (n - nPart);

				i0 = i;
			} else if (i == this.#pos + n) {
				res += imask(this.#view[idiv(i, 8)], i0 % 8, i % 8);
			}
		}

		this.#pos += n;
		return res << leftShift;
	}

	/**
	 * Moves position to next byte boundary
	 * @param {boolean} force - if true then move to next byte boundary if already at byte boundary
	 */
	moveToByteBoundary(force = false) {
		if (this.#pos % 8 != 0) {
			let n = 8 - this.#pos % 8;

			void this.readBits(n);
		} else if (force) {
			this.readBits(8);
		}
	}

	/**
	 * Reads 8 bits
	 * @returns {number}
	 */
	readByte() {
		return this.readBits(8);
	}

	/**
	 * Dumps remaining bits we #pos isn't yet at end.
	 * This is intended for debugging use.
	 */
	 dumpRemainingBits() {
		if (!this.eof()) {
			console.log("remaining bytes:");
			for (let first = true, i = idiv(this.#pos, 8); i < this.#view.length; first = false, i++) {
				if (first && this.#pos % 8 != 0) {
					console.log(byteToBitString(imask(this.#view[i], this.#pos % 8, 8) << 8 - this.#pos % 7));
				} else {
					console.log(byteToBitString(this.#view[i]));
				}
			}
		} else {
			console.log("eof");
		}
	}
}

/**
 * BitWriter turns a string of '0's and '1's into a list of bytes.
 * Finalization pads the bits using '0*1' if not yet aligned with the byte boundary.
 */
 class BitWriter {
	/**
	 * Concatenated and padded upon finalization
	 * @type {string[]}
	 */
	#parts;

	/**
	 * Number of bits written so far
	 * @type {number}
	 */
	#n;

	constructor() {
		this.#parts = [];
		this.#n = 0;
	}

	/**
	 * @type {number}
	 */
	get length() {
		return this.#n;
	}

	/**
	 * Write a string of '0's and '1's to the BitWriter. 
	 * @param {string} bitChars
	 */
	write(bitChars) {
		for (let c of bitChars) {
			if (c != '0' && c != '1') {
				throw new Error("bad bit char");
			}
		}

		this.#parts.push(bitChars);
		this.#n += bitChars.length;
	}

	/**
	 * @param {number} byte
	 */
	writeByte(byte) {
		this.write(padZeroes(byte.toString(2), 8));
	}

	/**
	 * Add padding to the BitWriter in order to align with the byte boundary.
	 * If 'force == true' then 8 bits are added if the BitWriter is already aligned.
	 * @param {boolean} force 
	 */
	padToByteBoundary(force = false) {
		let nPad = 0;
		if (this.#n % 8 != 0) {
			nPad = 8 - this.#n % 8;
		} else if (force) {
			nPad = 8;
		}

		if (nPad != 0) {
			let padding = (new Array(nPad)).fill('0');
			padding[nPad - 1] = '1';

			this.#parts.push(padding.join(''));

			this.#n += nPad;
		}
	}

	/**
	 * Pads the BitWriter to align with the byte boundary and returns the resulting bytes.
	 * @param {boolean} force - force padding (will add one byte if already aligned)
	 * @returns {number[]}
	 */
	finalize(force = true) {
		this.padToByteBoundary(force);

		let chars = this.#parts.join('');

		let bytes = [];

		for (let i = 0; i < chars.length; i += 8) {
			let byteChars = chars.slice(i, i + 8);
			let byte = parseInt(byteChars, 2);

			bytes.push(byte);
		}

		return bytes;
	}
}

/**
 * UInt64 number (represented by 2 UInt32 numbers)
 */
class UInt64 {
	#high;
	#low;

	/**
	 * @param {number} high  - uint32 number
	 * @param {number} low - uint32 number
	 */
	constructor(high, low) {		
		this.#high = imod32(high);
		this.#low = imod32(low);
	}

	/**
	 * @returns {UInt64}
	 */
	static zero() {
		return new UInt64(0, 0);
	}

	/**
	 * @param {number[]} bytes - 8 uint8 numbers
	 * @param {boolean} littleEndian
	 * @returns {UInt64}
	 */
	static fromBytes(bytes, littleEndian = true) {
		/** @type {number} */
		let low;

		/** @type {number} */
		let high;

		if (littleEndian) {
			low  = (bytes[0] << 0) | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
			high = (bytes[4] << 0) | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24);
 		} else {
			high = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | (bytes[3] << 0);
			low  = (bytes[4] << 24) | (bytes[5] << 16) | (bytes[6] << 8) | (bytes[7] << 0);
		}

		return new UInt64(imod32(high), imod32(low));
	}

	/**
	 * @param {string} str 
	 * @returns {UInt64}
	 */
	static fromString(str) {
		let high = parseInt(str.slice(0,  8), 16);
		let low  = parseInt(str.slice(8, 16), 16);

		return new UInt64(high, low);
	}

	get high() {
		return this.#high;
	}

	get low() {
		return this.#low;
	}

	/**
	 * Returns [low[0], low[1], low[2], low[3], high[0], high[1], high[2], high[3]] if littleEndian==true
	 * @param {boolean} littleEndian
	 * @returns {number[]}
	 */
	toBytes(littleEndian = true) {
		let res = [
			(0x000000ff & this.#low),
			(0x0000ff00 & this.#low) >>> 8,
			(0x00ff0000 & this.#low) >>> 16,
			(0xff000000 & this.#low) >>> 24,
			(0x000000ff & this.#high),
			(0x0000ff00 & this.#high) >>> 8,
			(0x00ff0000 & this.#high) >>> 16,
			(0xff000000 & this.#high) >>> 24,
		];

		if (!littleEndian) {
			res.reverse(); 
		} 
		
		return res;
	}

	/**
	 * @param {UInt64} other 
	 * @returns {boolean}
	 */
	eq(other) {
		return (this.#high == other.#high) && (this.#low == other.#low);
	}

	/**
	 * @returns {UInt64} 
	 */
	not() {
		return new UInt64(~this.#high, ~this.#low);
	}

	/**
	 * @param {UInt64} other
	 * @returns {UInt64}
	 */
	and(other) {
		return new UInt64(this.#high & other.#high, this.#low & other.#low);
	}

	/**
	 * @param {UInt64} other 
	 * @returns {UInt64}
	 */
	xor(other) {
		return new UInt64(this.#high ^ other.#high, this.#low ^ other.#low);
	}

	/**
	 * @param {UInt64} other 
	 * @returns {UInt64}
	 */
	add(other) {
		let low = this.#low + other.#low;
		let high = this.#high + other.#high;

		if (low >= 0x100000000) {
			high += 1;
		}

		return new UInt64(high, low);
	}

	/**
	 * @param {number} n 
	 * @returns {UInt64}
	 */
	rotr(n) {
		if (n == 32) {
			return new UInt64(this.#low, this.#high);
		} else if (n > 32) {
			return (new UInt64(this.#low, this.#high)).rotr(n - 32);
		} else {
			return new UInt64(
				imod32((this.#high >>> n) | (this.#low  << (32 - n))), 
				imod32((this.#low  >>> n) | (this.#high << (32 - n)))
			);
		}
	}

	/**
	 * @param {number} n
	 * @returns {UInt64}
	 */
	shiftr(n) {
		if (n >= 32) {
			return new UInt64(0, this.#high >>> n - 32);
		} else {
			return new UInt64(this.#high >>> n, (this.#low >>> n) | (this.#high << (32 - n)));
		}
	}	
}

/**
 * Rfc 4648 base32 alphabet
 * @type {string}
 */
const DEFAULT_BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

/**
 * Bech32 base32 alphabet
 * @type {string}
 */
const BECH32_BASE32_ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

/**
 * Function that generates a random number between 0 and 1
 * @typedef {() => number} NumberGenerator
 */

/**
 * A collection of cryptography primitives are included here in order to avoid external dependencies
 *     mulberry32: random number generator
 *     base32 encoding and decoding
 *     bech32 encoding, checking, and decoding
 *     sha2_256, sha2_512, sha3 and blake2b hashing
 *     ed25519 pubkey generation, signing, and signature verification (NOTE: the current implementation is very slow)
 */
class Crypto {
	/**
	 * Returns a simple random number generator
	 * @param {number} seed
	 * @returns {NumberGenerator} - a random number generator
	 */
	static mulberry32(seed) {
		/**
		 * @type {NumberGenerator}
		 */
		return function() {
			let t = seed += 0x6D2B79F5;
			t = Math.imul(t ^ t >>> 15, t | 1);
			t ^= t + Math.imul(t ^ t >>> 7, t | 61);
			return ((t ^ t >>> 14) >>> 0) / 4294967296;
		}
	}

	/**
	 * Alias for rand generator of choice
	 * @param {number} seed
	 * @returns {NumberGenerator} - the random number generator function
	 */
	static rand(seed) {
		return this.mulberry32(seed);
	}
	
	/**
	 * Encode bytes in special base32.
	 * @example
	 * Crypto.encodeBase32(stringToBytes("f")) => "my"
	 * @example
	 * Crypto.encodeBase32(stringToBytes("fo")) => "mzxq"
	 * @example
	 * Crypto.encodeBase32(stringToBytes("foo")) => "mzxw6"
	 * @example
	 * Crypto.encodeBase32(stringToBytes("foob")) => "mzxw6yq"
	 * @example
	 * Crypto.encodeBase32(stringToBytes("fooba")) => "mzxw6ytb"
	 * @example
	 * Crypto.encodeBase32(stringToBytes("foobar")) => "mzxw6ytboi"
	 * @param {number[]} bytes - uint8 numbers
	 * @param {string} alphabet - list of chars
	 * @return {string}
	 */
	static encodeBase32(bytes, alphabet = DEFAULT_BASE32_ALPHABET) {
		return Crypto.encodeBase32Bytes(bytes).map(c => alphabet[c]).join("");
	}

	/**
	 * Internal method
	 * @param {number[]} bytes 
	 * @returns {number[]} - list of numbers between 0 and 32
	 */
	static encodeBase32Bytes(bytes)  {
		let result = [];

		let reader = new BitReader(bytes, false);

		while (!reader.eof()) {
			result.push(reader.readBits(5));
		}

		return result;
	}

	/**
	 * Decode base32 string into bytes.
	 * @example
	 * bytesToString(Crypto.decodeBase32("my")) => "f"
	 * @example
	 * bytesToString(Crypto.decodeBase32("mzxq")) => "fo"
	 * @example
	 * bytesToString(Crypto.decodeBase32("mzxw6")) => "foo"
	 * @example
	 * bytesToString(Crypto.decodeBase32("mzxw6yq")) => "foob"
	 * @example
	 * bytesToString(Crypto.decodeBase32("mzxw6ytb")) => "fooba"
	 * @example
	 * bytesToString(Crypto.decodeBase32("mzxw6ytboi")) => "foobar"
	 * @param {string} encoded
	 * @param {string} alphabet
	 * @return {number[]}
	 */
	static decodeBase32(encoded, alphabet = DEFAULT_BASE32_ALPHABET) {
		let writer = new BitWriter();

		let n = encoded.length;
		for (let i = 0; i < n; i++) {
			let c = encoded[i];
			let code = alphabet.indexOf(c.toLowerCase());

			if (i == n - 1) {
				// last, make sure we align to byte

				let nCut = n*5 - 8*Math.floor(n*5/8);

				let bits = padZeroes(code.toString(2), 5)

				writer.write(bits.slice(0, 5 - nCut));
			} else {
				let bits = padZeroes(code.toString(2), 5);

				writer.write(bits);
			}
		}

		let result = writer.finalize(false);

		return result;
	}

	/**
	 * Expand human readable prefix of the bech32 encoding so it can be used in the checkSum
	 * Internal method.
	 * @param {string} hrp
	 * @returns {number[]}
	 */
	static expandBech32HumanReadablePart(hrp) {
		let bytes = [];
		for (let c of hrp) {
			bytes.push(c.charCodeAt(0) >> 5);
		}

		bytes.push(0);

		for (let c of hrp) {
			bytes.push(c.charCodeAt(0) & 31);
		}

		return bytes;
	}

	/**
	 * Used as part of the bech32 checksum.
	 * Internal method.
	 * @param {number[]} bytes 
	 * @returns {number}
	 */
	static calcBech32Polymod(bytes) {
		const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

		let chk = 1;
		for (let b of bytes) {
			let c = (chk >> 25);
			chk = (chk & 0x1fffffff) << 5 ^ b;

			for (let i = 0; i < 5; i++) {
				if (((c >> i) & 1) != 0) {
					chk ^= GEN[i];
				}
			}
 		}

		return chk;
	}

	/**
	 * Generate the bech32 checksum
	 * Internal method
	 * @param {string} hrp 
	 * @param {number[]} data - numbers between 0 and 32
	 * @returns {number[]} - 6 numbers between 0 and 32
	 */
	static calcBech32Checksum(hrp, data) {
		let bytes = Crypto.expandBech32HumanReadablePart(hrp).concat(data);

		let chk = Crypto.calcBech32Polymod(bytes.concat([0,0,0,0,0,0])) ^ 1;

		let chkSum = [];
		for (let i = 0; i < 6; i++) {
			chkSum.push((chk >> 5 * (5 - i)) & 31);
		}

		return chkSum;
	}

	/**
	 * Creates a bech32 checksummed string (used to represent Cardano addresses)
	 * @example
	 * Crypto.encodeBech32("foo", stringToBytes("foobar")) => "foo1vehk7cnpwgry9h96"
	 * @example
	 * Crypto.encodeBech32("addr_test", hexToBytes("70a9508f015cfbcffc3d88ac4c1c934b5b82d2bb281d464672f6c49539")) => "addr_test1wz54prcptnaullpa3zkyc8ynfddc954m9qw5v3nj7mzf2wggs2uld"
	 * @param {string} hrp 
	 * @param {number[]} data - uint8 0 - 256
	 * @returns {string}
	 */
	static encodeBech32(hrp, data) {
		assert(hrp.length > 0, "human-readable-part must have non-zero length");

		data = Crypto.encodeBase32Bytes(data);

		let chkSum = Crypto.calcBech32Checksum(hrp, data);

		return hrp + "1" + data.concat(chkSum).map(i => BECH32_BASE32_ALPHABET[i]).join("");
	}

	/**
	 * Decomposes a bech32 checksummed string (i.e. Cardano address), and returns the human readable part and the original bytes
	 * Throws an error if checksum is invalid.
	 * @example
	 * bytesToHex(Crypto.decodeBech32("addr_test1wz54prcptnaullpa3zkyc8ynfddc954m9qw5v3nj7mzf2wggs2uld")[1]) => "70a9508f015cfbcffc3d88ac4c1c934b5b82d2bb281d464672f6c49539"
	 * @param {string} addr 
	 * @returns {[string, number[]]}
	 */
	static decodeBech32(addr) {
		assert(Crypto.verifyBech32(addr), "invalid bech32 addr");

		let i = addr.indexOf("1");

		assert(i != -1);

		let hrp = addr.slice(0, i);

		addr = addr.slice(i+1);

		let data = Crypto.decodeBase32(addr.slice(0, addr.length - 6), BECH32_BASE32_ALPHABET);

		return [hrp, data];
	}

	/**
	 * Verify a bech32 checksum
	 * @example
	 * Crypto.verifyBech32("foo1vehk7cnpwgry9h96") => true
	 * @example
	 * Crypto.verifyBech32("foo1vehk7cnpwgry9h97") => false
	 * @example
	 * Crypto.verifyBech32("a12uel5l") => true
	 * @example
	 * Crypto.verifyBech32("mm1crxm3i") => false
	 * @example
	 * Crypto.verifyBech32("A1G7SGD8") => false
	 * @example
	 * Crypto.verifyBech32("abcdef1qpzry9x8gf2tvdw0s3jn54khce6mua7lmqqqxw") => true
	 * @example
	 * Crypto.verifyBech32("?1ezyfcl") => true
	 * @example
	 * Crypto.verifyBech32("addr_test1wz54prcptnaullpa3zkyc8ynfddc954m9qw5v3nj7mzf2wggs2uld") => true
	 * @param {string} addr
	 * @returns {boolean}
	 */
	static verifyBech32(addr) {
		let data =[];

		let i = addr.indexOf("1");
		if (i == -1 || i == 0) {
			return false;
		}

		let hrp = addr.slice(0, i);

		addr = addr.slice(i + 1);

		for (let c of addr) {
			let j = BECH32_BASE32_ALPHABET.indexOf(c);
			if (j == -1) {
				return false;
			}

			data.push(j);
		}

		let chkSumA = data.slice(data.length - 6);

		let chkSumB = Crypto.calcBech32Checksum(hrp, data.slice(0, data.length - 6));

		for (let i = 0; i < 6; i++) {
			if (chkSumA[i] != chkSumB[i]) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Calculates sha2-256 (32bytes) hash of a list of uint8 numbers.
	 * Result is also a list of uint8 number.
	 * @example 
	 * bytesToHex(Crypto.sha2_256([0x61, 0x62, 0x63])) => "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
	 * @example
	 * Crypto.sha2_256(stringToBytes("Hello, World!")) => [223, 253, 96, 33, 187, 43, 213, 176, 175, 103, 98, 144, 128, 158, 195, 165, 49, 145, 221, 129, 199, 247, 10, 75, 40, 104, 138, 54, 33, 130, 152, 111]
	 * @param {number[]} bytes - list of uint8 numbers
	 * @returns {number[]} - list of uint8 numbers
	 */
	static sha2_256(bytes) {
		/**
		 * Pad a bytearray so its size is a multiple of 64 (512 bits).
		 * Internal method.
		 * @param {number[]} src - list of uint8 numbers
		 * @returns {number[]}
		 */
		function pad(src) {
			let nBits = src.length*8;

			let dst = src.slice();

			dst.push(0x80);

			let nZeroes = (64 - dst.length%64) - 8;
			if (nZeroes < 0) {
				nZeroes += 64;
			}

			for (let i = 0; i < nZeroes; i++) {
				dst.push(0);
			}

			// assume nBits fits in 32 bits

			dst.push(0);
			dst.push(0);
			dst.push(0);
			dst.push(0);
			dst.push(imod8(nBits >> 24));
			dst.push(imod8(nBits >> 16));
			dst.push(imod8(nBits >> 8));
			dst.push(imod8(nBits >> 0));
			
			return dst;
		}

		/**
		 * @type {number[]} - 64 uint32 numbers
		 */
		 const k = [
			0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
			0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
			0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
			0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
			0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
			0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
			0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
			0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
			0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
			0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
			0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
			0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
			0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
			0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
			0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
			0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
		];

		/**
		 * Initial hash (updated during compression phase)
		 * @type {number[]} - 8 uint32 number
		 */
		const hash = [
			0x6a09e667, 
			0xbb67ae85, 
			0x3c6ef372, 
			0xa54ff53a, 
			0x510e527f, 
			0x9b05688c, 
			0x1f83d9ab, 
			0x5be0cd19,
		];
	
		/**
		 * @param {number} x
		 * @returns {number}
		 */
		 function sigma0(x) {
			return irotr(x, 7) ^ irotr(x, 18) ^ (x >>> 3);
		}

		/**
		 * @param {number} x
		 * @returns {number}
		 */
		function sigma1(x) {
			return irotr(x, 17) ^ irotr(x, 19) ^ (x >>> 10);
		}

		bytes = pad(bytes);

		// break message in successive 64 byte chunks
		for (let chunkStart = 0; chunkStart < bytes.length; chunkStart += 64) {
			let chunk = bytes.slice(chunkStart, chunkStart + 64);

			let w = (new Array(64)).fill(0); // array of 32 bit numbers!

			// copy chunk into first 16 positions of w
			for (let i = 0; i < 16; i++) {
				w[i] = (chunk[i*4 + 0] << 24) |
					   (chunk[i*4 + 1] << 16) |
					   (chunk[i*4 + 2] <<  8) |
					   (chunk[i*4 + 3]);
			}

			// extends the first 16 positions into the remaining 48 positions
			for (let i = 16; i < 64; i++) {
				w[i] = imod32(w[i-16] + sigma0(w[i-15]) + w[i-7] + sigma1(w[i-2]));
			}

			// intialize working variables to current hash value
			let a = hash[0];
			let b = hash[1];
			let c = hash[2];
			let d = hash[3];
			let e = hash[4];
			let f = hash[5];
			let g = hash[6];
			let h = hash[7];

			// compression function main loop
			for (let i = 0; i < 64; i++) {
				let S1 = irotr(e, 6) ^ irotr(e, 11) ^ irotr(e, 25);
				let ch = (e & f) ^ ((~e) & g);
				let temp1 = imod32(h + S1 + ch + k[i] + w[i]);
				let S0 = irotr(a, 2) ^ irotr(a, 13) ^ irotr(a, 22);
				let maj = (a & b) ^ (a & c) ^ (b & c);
				let temp2 = imod32(S0 + maj);

				h = g;
				g = f;
				f = e;
				e = imod32(d + temp1);
				d = c;
				c = b;
				b = a;
				a = imod32(temp1 + temp2);
			}

			// update the hash
			hash[0] = imod32(hash[0] + a);
			hash[1] = imod32(hash[1] + b);
			hash[2] = imod32(hash[2] + c);
			hash[3] = imod32(hash[3] + d);
			hash[4] = imod32(hash[4] + e);
			hash[5] = imod32(hash[5] + f);
			hash[6] = imod32(hash[6] + g);
			hash[7] = imod32(hash[7] + h);
		}

		// produce the final digest of uint8 numbers
		let result = [];
		for (let i = 0; i < 8; i++) {
			let item = hash[i];

			result.push(imod8(item >> 24));
			result.push(imod8(item >> 16));
			result.push(imod8(item >>  8));
			result.push(imod8(item >>  0));
		}
	
		return result;
	}

	/**
	 * Calculates sha2-512 (64bytes) hash of a list of uint8 numbers.
	 * Result is also a list of uint8 number.
	 * @example 
	 * bytesToHex(Crypto.sha2_512([0x61, 0x62, 0x63])) => "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f"
	 * @example 
	 * bytesToHex(Crypto.sha2_512([])) => "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e"
	 * @param {number[]} bytes - list of uint8 numbers
	 * @returns {number[]} - list of uint8 numbers
	 */
	 static sha2_512(bytes) {
		/**
		 * Pad a bytearray so its size is a multiple of 128 (1024 bits).
		 * Internal method.
		 * @param {number[]} src - list of uint8 numbers
		 * @returns {number[]}
		 */
		function pad(src) {
			let nBits = src.length*8;

			let dst = src.slice();

			dst.push(0x80);

			let nZeroes = (128 - dst.length%128) - 8;
			if (nZeroes < 0) {
				nZeroes += 128;
			}

			for (let i = 0; i < nZeroes; i++) {
				dst.push(0);
			}

			// assume nBits fits in 32 bits

			dst.push(0);
			dst.push(0);
			dst.push(0);
			dst.push(0);
			dst.push(imod8(nBits >> 24));
			dst.push(imod8(nBits >> 16));
			dst.push(imod8(nBits >> 8));
			dst.push(imod8(nBits >> 0));
			
			return dst;
		}

		/**
		 * @type {UInt64[]} - 80 uint64 numbers
		 */
		const k = [
			new UInt64(0x428a2f98, 0xd728ae22), new UInt64(0x71374491, 0x23ef65cd), 
			new UInt64(0xb5c0fbcf, 0xec4d3b2f), new UInt64(0xe9b5dba5, 0x8189dbbc),
			new UInt64(0x3956c25b, 0xf348b538), new UInt64(0x59f111f1, 0xb605d019), 
			new UInt64(0x923f82a4, 0xaf194f9b), new UInt64(0xab1c5ed5, 0xda6d8118),
			new UInt64(0xd807aa98, 0xa3030242), new UInt64(0x12835b01, 0x45706fbe), 
			new UInt64(0x243185be, 0x4ee4b28c), new UInt64(0x550c7dc3, 0xd5ffb4e2),
			new UInt64(0x72be5d74, 0xf27b896f), new UInt64(0x80deb1fe, 0x3b1696b1), 
			new UInt64(0x9bdc06a7, 0x25c71235), new UInt64(0xc19bf174, 0xcf692694),
			new UInt64(0xe49b69c1, 0x9ef14ad2), new UInt64(0xefbe4786, 0x384f25e3), 
			new UInt64(0x0fc19dc6, 0x8b8cd5b5), new UInt64(0x240ca1cc, 0x77ac9c65),
			new UInt64(0x2de92c6f, 0x592b0275), new UInt64(0x4a7484aa, 0x6ea6e483), 
			new UInt64(0x5cb0a9dc, 0xbd41fbd4), new UInt64(0x76f988da, 0x831153b5),
			new UInt64(0x983e5152, 0xee66dfab), new UInt64(0xa831c66d, 0x2db43210), 
			new UInt64(0xb00327c8, 0x98fb213f), new UInt64(0xbf597fc7, 0xbeef0ee4),
			new UInt64(0xc6e00bf3, 0x3da88fc2), new UInt64(0xd5a79147, 0x930aa725), 
			new UInt64(0x06ca6351, 0xe003826f), new UInt64(0x14292967, 0x0a0e6e70),
			new UInt64(0x27b70a85, 0x46d22ffc), new UInt64(0x2e1b2138, 0x5c26c926), 
			new UInt64(0x4d2c6dfc, 0x5ac42aed), new UInt64(0x53380d13, 0x9d95b3df),
			new UInt64(0x650a7354, 0x8baf63de), new UInt64(0x766a0abb, 0x3c77b2a8), 
			new UInt64(0x81c2c92e, 0x47edaee6), new UInt64(0x92722c85, 0x1482353b),
			new UInt64(0xa2bfe8a1, 0x4cf10364), new UInt64(0xa81a664b, 0xbc423001), 
			new UInt64(0xc24b8b70, 0xd0f89791), new UInt64(0xc76c51a3, 0x0654be30),
			new UInt64(0xd192e819, 0xd6ef5218), new UInt64(0xd6990624, 0x5565a910), 
			new UInt64(0xf40e3585, 0x5771202a), new UInt64(0x106aa070, 0x32bbd1b8),
			new UInt64(0x19a4c116, 0xb8d2d0c8), new UInt64(0x1e376c08, 0x5141ab53), 
			new UInt64(0x2748774c, 0xdf8eeb99), new UInt64(0x34b0bcb5, 0xe19b48a8),
			new UInt64(0x391c0cb3, 0xc5c95a63), new UInt64(0x4ed8aa4a, 0xe3418acb), 
			new UInt64(0x5b9cca4f, 0x7763e373), new UInt64(0x682e6ff3, 0xd6b2b8a3),
			new UInt64(0x748f82ee, 0x5defb2fc), new UInt64(0x78a5636f, 0x43172f60), 
			new UInt64(0x84c87814, 0xa1f0ab72), new UInt64(0x8cc70208, 0x1a6439ec),
			new UInt64(0x90befffa, 0x23631e28), new UInt64(0xa4506ceb, 0xde82bde9), 
			new UInt64(0xbef9a3f7, 0xb2c67915), new UInt64(0xc67178f2, 0xe372532b),
			new UInt64(0xca273ece, 0xea26619c), new UInt64(0xd186b8c7, 0x21c0c207), 
			new UInt64(0xeada7dd6, 0xcde0eb1e), new UInt64(0xf57d4f7f, 0xee6ed178),
            new UInt64(0x06f067aa, 0x72176fba), new UInt64(0x0a637dc5, 0xa2c898a6), 
			new UInt64(0x113f9804, 0xbef90dae), new UInt64(0x1b710b35, 0x131c471b),
            new UInt64(0x28db77f5, 0x23047d84), new UInt64(0x32caab7b, 0x40c72493), 
			new UInt64(0x3c9ebe0a, 0x15c9bebc), new UInt64(0x431d67c4, 0x9c100d4c),
            new UInt64(0x4cc5d4be, 0xcb3e42b6), new UInt64(0x597f299c, 0xfc657e2a), 
			new UInt64(0x5fcb6fab, 0x3ad6faec), new UInt64(0x6c44198c, 0x4a475817),
		];

		/**
		 * Initial hash (updated during compression phase)
		 * @type {UInt64[]} - 8 uint64 numbers
		 */
		const hash = [
			new UInt64(0x6a09e667, 0xf3bcc908),
			new UInt64(0xbb67ae85, 0x84caa73b),
			new UInt64(0x3c6ef372, 0xfe94f82b),
			new UInt64(0xa54ff53a, 0x5f1d36f1),
			new UInt64(0x510e527f, 0xade682d1),
			new UInt64(0x9b05688c, 0x2b3e6c1f),
			new UInt64(0x1f83d9ab, 0xfb41bd6b),
			new UInt64(0x5be0cd19, 0x137e2179),
		];
	
		/**
		 * @param {UInt64} x
		 * @returns {UInt64} 
		 */
		function sigma0(x) {
			return x.rotr(1).xor(x.rotr(8)).xor(x.shiftr(7));
		}

		/**
		 * @param {UInt64} x
		 * @returns {UInt64}
		 */
		function sigma1(x) {
			return x.rotr(19).xor(x.rotr(61)).xor(x.shiftr(6));
		}

		bytes = pad(bytes);

		// break message in successive 64 byte chunks
		for (let chunkStart = 0; chunkStart < bytes.length; chunkStart += 128) {
			let chunk = bytes.slice(chunkStart, chunkStart + 128);

			let w = (new Array(80)).fill(UInt64.zero()); // array of 32 bit numbers!

			// copy chunk into first 16 hi/lo positions of w (i.e. into first 32 uint32 positions)
			for (let i = 0; i < 16; i++) {
				w[i] = UInt64.fromBytes(chunk.slice(i*8, i*8 + 8), false);
			}

			// extends the first 16 positions into the remaining 80 positions
			for (let i = 16; i < 80; i++) {
				w[i] = sigma1(w[i-2]).add(w[i-7]).add(sigma0(w[i-15])).add(w[i-16]);
			}

			// intialize working variables to current hash value
			let a = hash[0];
			let b = hash[1];
			let c = hash[2];
			let d = hash[3];
			let e = hash[4];
			let f = hash[5];
			let g = hash[6];
			let h = hash[7];

			// compression function main loop
			for (let i = 0; i < 80; i++) {
				let S1 = e.rotr(14).xor(e.rotr(18)).xor(e.rotr(41));
				let ch = e.and(f).xor(e.not().and(g));
				let temp1 = h.add(S1).add(ch).add(k[i]).add(w[i]);
				let S0 = a.rotr(28).xor(a.rotr(34)).xor(a.rotr(39));
				let maj = a.and(b).xor(a.and(c)).xor(b.and(c));
				let temp2 = S0.add(maj);

				h = g;
				g = f;
				f = e;
				e = d.add(temp1);
				d = c;
				c = b;
				b = a;
				a = temp1.add(temp2);
			}

			// update the hash
			hash[0] = hash[0].add(a);
			hash[1] = hash[1].add(b);
			hash[2] = hash[2].add(c);
			hash[3] = hash[3].add(d);
			hash[4] = hash[4].add(e);
			hash[5] = hash[5].add(f);
			hash[6] = hash[6].add(g);
			hash[7] = hash[7].add(h);
		}

		// produce the final digest of uint8 numbers
		let result = [];
		for (let i = 0; i < 8; i++) {
			let item = hash[i];

			result = result.concat(hash[i].toBytes(false));
		}
	
		return result;
	}

	/**
	 * Calculates sha3-256 (32bytes) hash of a list of uint8 numbers.
	 * Result is also a list of uint8 number.
	 * Sha3 only bit-wise operations, so 64-bit operations can easily be replicated using 2 32-bit operations instead
	 * @example
	 * bytesToHex(Crypto.sha3(stringToBytes("abc"))) => "3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532"
	 * @example
	 * bytesToHex(Crypto.sha3((new Array(136)).fill(1))) => "b36dc2167c4d9dda1a58b87046c8d76a6359afe3612c4de8a38857e09117b2db"
	 * @example
	 * bytesToHex(Crypto.sha3((new Array(135)).fill(2))) => "5bdf5d815d29a9d7161c66520efc17c2edd7898f2b99a029e8d2e4ff153407f4"
	 * @example
	 * bytesToHex(Crypto.sha3((new Array(134)).fill(3))) => "8e6575663dfb75a88f94a32c5b363c410278b65020734560d968aadd6896a621"
	 * @example
	 * bytesToHex(Crypto.sha3((new Array(137)).fill(4))) => "f10b39c3e455006aa42120b9751faa0f35c821211c9d086beb28bf3c4134c6c6"
	 * @param {number[]} bytes - list of uint8 numbers
	 * @returns {number[]} - list of uint8 numbers
	 */
	static sha3(bytes) {
		/**
		 * @type {number} - state width (1600 bits, )
		 */
		const WIDTH = 200;

		/**
		 * @type {number} - rate (1088 bits, 136 bytes)
		 */
		const RATE = 136;

		/**
		 * @type {number} - capacity
		 */
		const CAP = WIDTH - RATE;

		/**
		 * Apply 1000...1 padding until size is multiple of r.
		 * If already multiple of r then add a whole block of padding.
		 * @param {number[]} src - list of uint8 numbers
		 * @returns {number[]} - list of uint8 numbers
		 */
		function pad(src) {
			let dst = src.slice();

			/** @type {number} */
			let nZeroes = RATE - 2 - (dst.length%RATE);
			if (nZeroes < -1) {
				nZeroes += RATE - 2;
			}

			if (nZeroes == -1) {
				dst.push(0x86);
			} else {
				dst.push(0x06);

				for (let i = 0; i < nZeroes; i++) {
					dst.push(0);
				}

				dst.push(0x80);
			}

			assert(dst.length%RATE == 0);
			
			return dst;
		}

		/**
		 * 24 numbers used in the sha3 permute function
		 * @type {number[]}
		 */
		const OFFSETS = [6, 12, 18, 24, 3, 9, 10, 16, 22, 1, 7, 13, 19, 20, 4, 5, 11, 17, 23, 2, 8, 14, 15, 21];

		/**
		 * 24 numbers used in the sha3 permute function
		 * @type {number[]}
		 */
		const SHIFTS = [-12, -11, 21, 14, 28, 20, 3, -13, -29, 1, 6, 25, 8, 18, 27, -4, 10, 15, -24, -30, -23, -7, -9, 2];

		/**
		 * Round constants used in the sha3 permute function
		 * @type {UInt64[]} 
		 */
		const RC = [
			new UInt64(0x00000000, 0x00000001) , 
			new UInt64(0x00000000, 0x00008082) , 
			new UInt64(0x80000000, 0x0000808a) ,
			new UInt64(0x80000000, 0x80008000) ,
			new UInt64(0x00000000, 0x0000808b) ,
			new UInt64(0x00000000, 0x80000001) ,
			new UInt64(0x80000000, 0x80008081) ,
			new UInt64(0x80000000, 0x00008009) ,
			new UInt64(0x00000000, 0x0000008a) ,
			new UInt64(0x00000000, 0x00000088) ,
			new UInt64(0x00000000, 0x80008009) ,
			new UInt64(0x00000000, 0x8000000a) ,
			new UInt64(0x00000000, 0x8000808b) ,
			new UInt64(0x80000000, 0x0000008b) ,
			new UInt64(0x80000000, 0x00008089) ,
			new UInt64(0x80000000, 0x00008003) ,
			new UInt64(0x80000000, 0x00008002) ,
			new UInt64(0x80000000, 0x00000080) ,
			new UInt64(0x00000000, 0x0000800a) ,
			new UInt64(0x80000000, 0x8000000a) ,
			new UInt64(0x80000000, 0x80008081) ,
			new UInt64(0x80000000, 0x00008080) ,
			new UInt64(0x00000000, 0x80000001) ,
			new UInt64(0x80000000, 0x80008008) ,
		];
		
		/**
		 * @param {UInt64[]} s 
		 */
		function permute(s) {	
			/**
			 * @type {UInt64[]}
			 */		
			let c = new Array(5);

			/**
			 * @type {UInt64[]}
			 */
			let b = new Array(25);
			
			for (let round = 0; round < 24; round++) {
				for (let i = 0; i < 5; i++) {
					c[i] = s[i].xor(s[i+5]).xor(s[i+10]).xor(s[i+15]).xor(s[i+20]);
 				}

				for (let i = 0; i < 5; i++) {
					let i1 = (i+1)%5;
					let i2 = (i+4)%5;

					let tmp = c[i2].xor(c[i1].rotr(63));

					for (let j = 0; j < 5; j++) {
						s[i+5*j] = s[i+5*j].xor(tmp);
					}
				}				

				b[0] = s[0];

				for(let i = 1; i < 25; i++) {
					let offset = OFFSETS[i-1];

					let left = Math.abs(SHIFTS[i-1]);
					let right = 32 - left;

					if (SHIFTS[i-1] < 0) {
						b[i] = s[offset].rotr(right);
					} else {
						b[i] = s[offset].rotr(right + 32);
					}
				}

				for (let i = 0; i < 5; i++) {
					for (let j = 0; j < 5; j++) {
						s[i*5+j] = b[i*5+j].xor(b[i*5 + (j+1)%5].not().and(b[i*5 + (j+2)%5]))
					}
				}

				s[0] = s[0].xor(RC[round]);
			}
		}

		bytes = pad(bytes);

		// initialize the state
		/**
		 * @type {UInt64[]}
		 */
		let state = (new Array(WIDTH/8)).fill(UInt64.zero());

		for (let chunkStart = 0; chunkStart < bytes.length; chunkStart += RATE) {
			// extend the chunk to become length WIDTH
			let chunk = bytes.slice(chunkStart, chunkStart + RATE).concat((new Array(CAP)).fill(0));

			// element-wise xor with 'state'
			for (let i = 0; i < WIDTH; i += 8) {
				state[i/8] = state[i/8].xor(UInt64.fromBytes(chunk.slice(i, i+8)));

				// beware: a uint32 is stored as little endian, but a pair of uint32s that form a uin64 are stored in big endian format!
				//state[i/4] ^= (chunk[i] << 0) | (chunk[i+1] << 8) | (chunk[i+2] << 16) | (chunk[i+3] << 24);
			}

			// apply block permutations
			permute(state);
		}

		/** @type {number[]} */
		let hash = [];
		for (let i = 0; i < 4; i++) {
			hash = hash.concat(state[i].toBytes());
		}

		return hash;
	}

	/**
	 * Calculates blake2-256 (32 bytes) hash of a list of uint8 numbers.
	 * Result is also a list of uint8 number.
	 * Blake2b is a 64bit algorithm, so we need to be careful when replicating 64-bit operations with 2 32-bit numbers (low-word overflow must spill into high-word, and shifts must go over low/high boundary)
	 * @example                                        
	 * bytesToHex(Crypto.blake2b([0, 1])) => "01cf79da4945c370c68b265ef70641aaa65eaa8f5953e3900d97724c2c5aa095"
	 * @example
	 * bytesToHex(Crypto.blake2b(stringToBytes("abc"), 64)) => "ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923"
	 * @param {number[]} bytes 
	 * @param {number} digestSize - 32 or 64
	 * @returns {number[]}
	 */
	static blake2b(bytes, digestSize = BLAKE2B_DIGEST_SIZE) {
		/**
		 * 128 bytes (16*8 byte words)
		 * @type {number}
		 */
		const WIDTH = 128;

		/**
		 * Initialization vector
		 */
		const IV = [
			new UInt64(0x6a09e667, 0xf3bcc908), 
			new UInt64(0xbb67ae85, 0x84caa73b),
			new UInt64(0x3c6ef372, 0xfe94f82b), 
			new UInt64(0xa54ff53a, 0x5f1d36f1),
			new UInt64(0x510e527f, 0xade682d1),
			new UInt64(0x9b05688c, 0x2b3e6c1f),
			new UInt64(0x1f83d9ab, 0xfb41bd6b), 
			new UInt64(0x5be0cd19, 0x137e2179), 
		];

		const SIGMA = [
			[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
			[14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
			[11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
			[7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
			[9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
			[2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
			[12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
			[13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
			[6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
			[10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0],
		];

		/**
		 * @param {number[]} src - list of uint8 bytes
		 * @returns {number[]} - list of uint8 bytes
		 */
		function pad(src) {
			let dst = src.slice();

			let nZeroes = dst.length == 0 ? WIDTH : (WIDTH - dst.length%WIDTH)%WIDTH;

			// just padding with zeroes, the actual message length is used during compression stage of final block in order to uniquely hash messages of different lengths
			for (let i = 0; i < nZeroes; i++) {
				dst.push(0);
			}
			
			return dst;
		}

		/**
		 * @param {UInt64[]} v
		 * @param {UInt64[]} chunk
		 * @param {number} a - index
		 * @param {number} b - index
		 * @param {number} c - index
		 * @param {number} d - index
		 * @param {number} i - index in chunk for low word 1
		 * @param {number} j - index in chunk for low word 2
		 */
		function mix(v, chunk, a, b, c, d, i, j) {
			let x = chunk[i];
			let y = chunk[j];

			v[a] = v[a].add(v[b]).add(x);
			v[d] = v[d].xor(v[a]).rotr(32);
			v[c] = v[c].add(v[d]);
			v[b] = v[b].xor(v[c]).rotr(24);
			v[a] = v[a].add(v[b]).add(y);
			v[d] = v[d].xor(v[a]).rotr(16);
			v[c] = v[c].add(v[d]);
			v[b] = v[b].xor(v[c]).rotr(63);
		}

		/**
		 * @param {UInt64[]} h - state vector
		 * @param {UInt64[]} chunk
		 * @param {number} t - chunkEnd (expected to fit in uint32)
		 * @param {boolean} last
 		 */
		function compress(h, chunk, t, last) {
			// work vectors
			let v = h.slice().concat(IV.slice());

			v[12] = v[12].xor(new UInt64(0, imod32(t))); // v[12].high unmodified
			// v[13] unmodified

			if (last) {
				v[14] = v[14].xor(new UInt64(0xffffffff, 0xffffffff));
			}

			for (let round = 0; round < 12; round++) {
				let s = SIGMA[round%10];

				for (let i = 0; i < 4; i++) {
					mix(v, chunk, i, i+4, i+8, i+12, s[i*2], s[i*2+1]);
				}
				
				for (let i = 0; i < 4; i++) {
					mix(v, chunk, i, (i+1)%4 + 4, (i+2)%4 + 8, (i+3)%4 + 12, s[8+i*2], s[8 + i*2 + 1]);
				}
			}

			for (let i = 0; i < 8; i++) {
				h[i] = h[i].xor(v[i].xor(v[i+8]));
			}		
		}
 
		let nBytes = bytes.length;

		bytes = pad(bytes);

		// init hash vector
		let h = IV.slice();
		

		// setup the param block
		let paramBlock = new Uint8Array(64);
		paramBlock[0] = digestSize; // n output  bytes
		paramBlock[1] = 0; // key-length (always zero in our case) 
		paramBlock[2] = 1; // fanout
		paramBlock[3] = 1; // depth

		//mix in the parameter block
		let paramBlockView = new DataView(paramBlock.buffer);
		for (let i = 0; i < 8; i++) {
			h[i] = h[i].xor(new UInt64(
				paramBlockView.getUint32(i*8+4, true),
				paramBlockView.getUint32(i*8, true),
			));
		}
		
		// loop all chunks
		for (let chunkStart = 0; chunkStart < bytes.length; chunkStart += WIDTH) {
			let chunkEnd = chunkStart + WIDTH; // exclusive
			let chunk = bytes.slice(chunkStart, chunkStart + WIDTH);

			let chunk64 = new Array(WIDTH/8);
			for (let i = 0; i < WIDTH; i += 8) {
				chunk64[i/8] = UInt64.fromBytes(chunk.slice(i, i+8));
			}
			
			if (chunkStart == bytes.length - WIDTH) {
				// last block
				compress(h, chunk64, nBytes, true);
			} else {
				compress(h, chunk64, chunkEnd, false);
			}
		}

		// extract lowest BLAKE2B_DIGEST_SIZE (32 or 64) bytes from h

		/** @type {number[]} */
		let hash = [];
		for (let i = 0; i < digestSize/8; i++) {
			hash = hash.concat(h[i].toBytes());
		}

		return hash.slice(0, digestSize);
	}

	/**
	 * Hashes a serialized plutus-core script. 
	 * Result is the ValidatorHash for validator scripts, and MintingPolicyHash for minting_policy scripts.
	 * @param {number[]} cborBytes - serialized Plutus-Core program (2x wrapped CBOR Bytearray)
	 * @param {string} plutusScriptVersion - defaults to "PlutusScriptV2"
	 * @returns {number[]}
	 */
	static hashScript(cborBytes, plutusScriptVersion = PLUTUS_SCRIPT_VERSION) {
		let bytes = wrapCBORBytes(cborBytes);

		switch (plutusScriptVersion) {
			case "PlutusScriptV1":
				bytes.unshift(0x01);
				break;
			case "PlutusScriptV2":
				bytes.unshift(0x02);
				break;
			default:
				throw new Error("unhandled plutus core version");
		}

		return Crypto.blake2b(bytes, 28);
	}

	/**
	 * Crypto.Ed25519 exports the following functions:
	 *  * Crypto.Ed25519.derivePublicKey(privateKey)
	 *  * Crypto.Ed25519.sign(message, privateKey)
	 *  * Crypto.Ed25519.verify(message, signature, publicKey)
	 * 
	 * This is implementation is slow (~0.5s per verification), but should be good enough for simple client-side usage
	 * 
	 * Ported from: https://ed25519.cr.yp.to/python/ed25519.py
	 */
	static get Ed25519() {
		const Q = 57896044618658097711785492504343953926634992332820282019728792003956564819949n; // ipowi(255n) - 19n
		const Q38 = 7237005577332262213973186563042994240829374041602535252466099000494570602494n; // (Q + 3n)/8n
		const CURVE_ORDER = 7237005577332262213973186563042994240857116359379907606001950938285454250989n; // ipow2(252n) + 27742317777372353535851937790883648493n;
		const D = -4513249062541557337682894930092624173785641285191125241628941591882900924598840740n; // -121665n * invert(121666n);
		const I = 19681161376707505956807079304988542015446066515923890162744021073123829784752n; // expMod(2n, (Q - 1n)/4n, Q);
		
		/**
		 * @type {[bigint, bigint]}
		 */
		const BASE = [
			15112221349535400772501151409588531511454012693041857206046113283949847762202n, // recoverX(B[1]) % Q
			46316835694926478169428394003475163141307993866256225615783033603165251855960n, // (4n*invert(5n)) % Q
		];

		/**
		 * 
		 * @param {bigint} b 
		 * @param {bigint} e 
		 * @param {bigint} m 
		 * @returns {bigint}
		 */
		function expMod(b, e, m) {
			if (e == 0n) {
				return 1n;
			} else {
				let t = expMod(b, e/2n, m);
				t = (t*t) % m;

				if ((e % 2n) != 0n) {
					t = posMod(t*b, m)
				}

				return t;
			}
		}

		/**
		 * @param {bigint} n 
		 * @returns {bigint}
		 */
		function invert(n) {
			let a = posMod(n, Q);
			let b = Q;

			let x = 0n;
			let y = 1n;
			let u = 1n;
			let v = 0n;

			while (a !== 0n) {
				const q = b / a;
				const r = b % a;
				const m = x - u*q;
				const n = y - v*q;
				b = a;
				a = r;
				x = u;
				y = v;
				u = m;
				v = n;
			}

			return posMod(x, Q)
		}

		/**
		 * @param {bigint} y 
		 * @returns {bigint}
		 */
		function recoverX(y) {
			const yy = y*y;
			const xx = (yy - 1n) * invert(D*yy + 1n);
			let x = expMod(xx, Q38, Q);

			if (((x*x - xx) % Q) != 0n) {
				x = (x*I) % Q;
			}

			if ((x%2n) != 0n) {
				x = Q - x;
			}

			return x;
		}		

		/**
		 * Curve point 'addition'
		 * Note: this is probably the bottleneck of this Ed25519 implementation
		 * @param {[bigint, bigint]} a 
		 * @param {[bigint, bigint]} b 
		 * @returns {[bigint, bigint]}
		 */
		function edwards(a, b) {
			const x1 = a[0];
			const y1 = a[1];
			const x2 = b[0];
			const y2 = b[1];
			const dxxyy = D*x1*x2*y1*y2;
			const x3 = (x1*y2+x2*y1) * invert(1n+dxxyy);
			const y3 = (y1*y2+x1*x2) * invert(1n-dxxyy);
			return [posMod(x3, Q), posMod(y3, Q)];
		}

		/**
		 * @param {[bigint, bigint]} point 
		 * @param {bigint} n 
		 * @returns {[bigint, bigint]}
		 */
		function scalarMul(point, n) {
			if (n == 0n) {
				return [0n, 1n];
			} else {
				let sum = scalarMul(point, n/2n);
				sum = edwards(sum, sum);
				if ((n % 2n) != 0n) {
					sum = edwards(sum, point);
				}

				return sum;
			}
		}

		/**
		 * Curve point 'multiplication'
		 * @param {bigint} y 
		 * @returns {number[]}
		 */
		function encodeInt(y) {
			let bytes = bigIntToBytes(y).reverse();
			
			while (bytes.length < 32) {
				bytes.push(0);
			}

			return bytes;
		}

		/**
		 * @param {number[]} s 
		 * @returns {bigint}
		 */
		 function decodeInt(s) {
			return bytesToBigInt(s.reverse());
		}

		/**
		 * @param {[bigint, bigint]} point
		 * @returns {number[]}
		 */
		function encodePoint(point) {
			const [x, y] = point;

			let bytes = encodeInt(y);

			// last bit is determined by x

			bytes[31] = (bytes[31] & 0b011111111) | (Number(x & 1n) * 0b10000000);

			return bytes;
		}

		/**
		 * @param {number[]} bytes 
		 * @param {number} i - bit index
		 * @returns {number} - 0 or 1
		 */
		 function getBit(bytes, i) {
			return (bytes[Math.floor(i/8)] >> i%8) & 1
		}

		/**
		 * @param {[bigint, bigint]} point
		 * @returns {boolean}
		 */
		function isOnCurve(point) {
			const x = point[0];
			const y = point[1];
			const xx = x*x;
			const yy = y*y;
			return (-xx + yy - 1n - D*xx*yy) % Q == 0n;
		}

		/**
		 * @param {number[]} s 
		 */
		 function decodePoint(s) {
			assert(s.length == 32);

			let bytes = s.slice();
			bytes[31] = bytes[31] & 0b01111111;

			const y = decodeInt(bytes);

			let x = recoverX(y);
			if (Number(x & 1n) != getBit(s, 255)) {
				x = Q - x;
			}

			/**
			 * @type {[bigint, bigint]}
			 */
			const point = [x, y];

			if (!isOnCurve(point)) {
				throw new Error("point isn't on curve");
			}

			return point;
		}

		/**
		 * Couldn't think of a proper name for this function
		 * @param {number[]} h 
		 * @returns {bigint}
		 */
		function calca(h) {
			const a = 28948022309329048855892746252171976963317496166410141009864396001978282409984n; // ipow2(253)

			let bytes = h.slice(0, 32);
			bytes[0] = bytes[0] & 0b11111000;
			bytes[31] = bytes[31] & 0b00111111;

			let x = bytesToBigInt(bytes.reverse());
			return a + x;
		}

		/**
		 * @param {number[]} m 
		 * @returns {bigint}
		 */
		function ihash(m) {
			const h = Crypto.sha2_512(m);

			return decodeInt(h);
		}

		return {
			/**
			 * @param {number[]} privateKey 
			 * @returns {number[]}
			 */
			derivePublicKey: function(privateKey) {
				const privateKeyHash = Crypto.sha2_512(privateKey);
				const a = calca(privateKeyHash);
				const A = scalarMul(BASE, a);

				return encodePoint(A);
			},

			/**
			 * @param {number[]} message 
			 * @param {number[]} privateKey 
			 * @returns {number[]}
			 */
			sign: function(message, privateKey) {
				const privateKeyHash = Crypto.sha2_512(privateKey);
				const a = calca(privateKeyHash);

				// for convenience calculate publicKey here:
				const publicKey = encodePoint(scalarMul(BASE, a));

				const r = ihash(privateKeyHash.slice(32, 64).concat(message));
				const R = scalarMul(BASE, r);
				const S = posMod(r + ihash(encodePoint(R).concat(publicKey).concat(message))*a, CURVE_ORDER);

				return encodePoint(R).concat(encodeInt(S));
			},

			/**
			 * @param {number[]} signature 
			 * @param {number[]} message 
			 * @param {number[]} publicKey 
			 * @returns {boolean}
			 */
			verify: function(signature, message, publicKey) {
				if (signature.length != 64) {
					throw new Error(`unexpected signature length ${signature.length}`);
				}
	
				if (publicKey.length != 32) {
					throw new Error(`unexpected publickey length ${publicKey.length}`);
				}

				const R = decodePoint(signature.slice(0, 32));
				const A = decodePoint(publicKey);
				const S = decodeInt(signature.slice(32, 64));
				const h = ihash(signature.slice(0, 32).concat(publicKey).concat(message));

				const left = scalarMul(BASE, S);
				const right = edwards(R, scalarMul(A, h));

				return (left[0] == right[0]) && (left[1] == right[1]);
			}
		}
	}
}

/**
 * The IR class combines a string of intermediate representation sourcecode with an optional site.
 * The site is used for mapping IR code to the original source code.
 */
class IR {
	#content;
	#site;

	/**
	 * @param {string | IR[]} content 
	 * @param {?Site} site 
	 */
	constructor(content, site = null) {
		this.#content = content;
		this.#site = site;
	}

	get content() {
		return this.#content;
	}

	get site() {
		return this.#site;
	}

	/**
	 * Returns a list containing IR instances that themselves only contain strings
	 * @returns {IR[]}
	 */
	flatten() {
		if (typeof this.#content == "string") {
			return [this];
		} else {
			/**
			 * @type {IR[]}
			 */
			let result = [];

			for (let item of this.#content) {
				result = result.concat(item.flatten());
			}

			return result;
		}
	}

	/**
	 * Intersperse nested IR content with a separator
	 * @param {string} sep
	 * @returns {IR}
	 */
	join(sep) {
		if (typeof this.#content == "string") {
			return this;
		} else {
			/** @type {IR[]} */
			let result = [];

			for (let i = 0; i < this.#content.length; i++) {
				result.push(this.#content[i]);

				if (i < this.#content.length - 1) {
					result.push(new IR(sep))
				}
			}

			return new IR(result);
		}
	}

	/**
	 * @typedef {[number, Site][]} CodeMap
	 * @returns {[string, CodeMap]}
	 */
	generateSource() {
		let parts = this.flatten();

		/** @type {string[]} */
		let partSrcs = [];

		/** @type {CodeMap} */
		let codeMap = [];

		let pos = 0;
		for (let part of parts) {
			let rawPartSrc = part.content;

			if (typeof rawPartSrc == "string") {
				let origSite = part.site;
				if (origSite !== null) {
					/** @type {[number, Site]} */
					let pair = [pos, origSite];
					codeMap.push(pair);
				}

				let partSrc = replaceTabs(rawPartSrc);

				pos += partSrc.length;
				partSrcs.push(partSrc);
			} else {
				throw new Error("expected IR to contain only strings after flatten");
			}
		}

		return [partSrcs.join(""), codeMap];
	}
}

/**
 * A Source instance wraps a string so we can use it cheaply as a reference inside a Site.
 */
class Source {
	#raw;

	/**
	 * @param {string} raw 
	 */
	constructor(raw) {
		this.#raw = assertDefined(raw);
	}

	get raw() {
		return this.#raw;
	}

	/**
	 * Get char from the underlying string.
	 * Should work fine utf-8 runes.
	 * @param {number} pos
	 * @returns {string}
	 */
	getChar(pos) {
		return this.#raw[pos];
	}

	get length() {
		return this.#raw.length;
	}

	/**
	 * Calculates the line number of the line where the given character is located (0-based).
	 * @param {number} pos 
	 * @returns {number}
	 */
	posToLine(pos) {
		let line = 0;
		for (let i = 0; i < pos; i++) {
			if (this.#raw[i] == '\n') {
				line += 1;
			}
		}

		return line;
	}

	/**
	 * Calculates the column and line number where the given character is located (0-based).
	 * @param {number} pos
	 * @returns {[number, number]}
	 */
	// returns [col, line]
	posToColAndLine(pos) {
		let col = 0;
		let line = 0;
		for (let i = 0; i < pos; i++) {
			if (this.#raw[i] == '\n') {
				col = 0;
				line += 1;
			} else {
				col += 1;
			}
		}

		return [col, line];
	}

	/**
	 * Creates a more human-readable version of the source by prepending the line-numbers to each line.
	 * The line-numbers are at least two digits.
	 * @example
	 * (new Source("hello\nworld")).pretty() => "01  hello\n02  world"
	 * @returns {string}
	 */
	pretty() {
		let lines = this.#raw.split("\n");

		let nLines = lines.length;
		let nDigits = Math.max(Math.ceil(Math.log10(nLines)), 2); // line-number is at least two digits

		for (let i = 0; i < lines.length; i++) {
			lines[i] = String(i + 1).padStart(nDigits, '0') + "  " + lines[i];
		}

		return lines.join("\n");
	}
}

/**
 * UserErrors are generated when the user of Helios makes a mistake (eg. a syntax error),
 * or when the user of Helios throws an explicit error inside a script (eg. division by zero).
 */
export class UserError extends Error {
	#pos;
	#src;
	#info;

	/**
	 * @param {string} type 
	 * @param {Source} src 
	 * @param {number} pos 
	 * @param {string} info 
	 */
	constructor(type, src, pos, info = "") {
		let line = src.posToLine(pos);

		let msg = `${type} on line ${line + 1}`;
		if (info != "") {
			msg += `: ${info}`;
		}

		super(msg);
		this.#pos = pos;
		this.#src = src;
		this.#info = info;
	}

	get src() {
		return this.#src;
	}

	/**
	 * Constructs a SyntaxError
	 * @param {Source} src 
	 * @param {number} pos 
	 * @param {string} info 
	 * @returns {UserError}
	 */
	static syntaxError(src, pos, info = "") {
		return new UserError("SyntaxError", src, pos, info);
	}

	/**
	 * Constructs a TypeError
	 * @param {Source} src 
	 * @param {number} pos 
	 * @param {string} info 
	 * @returns {UserError}
	 */
	static typeError(src, pos, info = "") {
		return new UserError("TypeError", src, pos, info);
	}

	/**
	 * Constructs a ReferenceError (i.e. name undefined, or name unused)
	 * @param {Source} src 
	 * @param {number} pos 
	 * @param {string} info 
	 * @returns {UserError}
	 */
	static referenceError(src, pos, info = "") {
		return new UserError("ReferenceError", src, pos, info);
	}

	/**
	 * Constructs a RuntimeError (i.e. when PlutusCoreError is called)
	 * @param {Source} src 
	 * @param {number} pos 
	 * @param {string} info 
	 * @returns {UserError}
	 */
	static runtimeError(src, pos, info = "") {
		return new UserError("RuntimeError", src, pos, info);
	}

	/**
	 * @type {string}
	 */
	get info() {
		return this.#info;
	}

	/**
	 * @param {string} info 
	 * @returns {boolean}
	 */
	isError(info = "") {
		return this.info == info;
	}

	/**
	 * Calculates column/line position in 'this.src'.
	 * @returns {[number, number]}
	 */
	getFilePos() {
		return this.#src.posToColAndLine(this.#pos);
	}

	/**
	 * Dumps the error without throwing.
	 * If 'verbose == true' the Source is also pretty printed with line-numbers.
	 * @param {boolean} verbose 
	 */
	dump(verbose = false) {
		if (verbose) {
			console.error(this.#src.pretty());
		}

		console.error("\n" + this.message);
	}

	/**
	 * Returns the error message (alternative to e.message)
	 * @returns {string}
	 */
	toString() {
		return this.message;
	}

	/**
	 * Catches any UserErrors thrown inside 'fn()`.
	 * Dumps the error
	 * @template T
	 * @param {() => T} fn 
	 * @param {boolean} verbose 
	 * @returns {T | undefined}	
	 */
	static catch(fn, verbose = false) {
		try {
			return fn();
		} catch (error) {
			if (error instanceof UserError) {
				error.dump(verbose);
			} else {
				throw error;
			}
		}
	}
}

/**
 * Each Token/Expression/Statement has a Site, which encapsulates a position in a Source
 */
class Site {
	#src;
	#pos;

	/** @type {?Site} - end of token, exclusive */
	#endSite;

	/**@type {?Site} */
	#codeMapSite;

	/**
	 * @param {Source} src 
	 * @param {number} pos 
	 */
	constructor(src, pos) {
		this.#src = src;
		this.#pos = pos;
		this.#endSite = null;
		this.#codeMapSite = null;
	}

	static dummy() {
		return new Site(new Source(""), 0);
	}

	get src() {
		return this.#src;
	}

	get pos() {
		return this.#pos;
	}

	get line() {
		return this.#src.posToLine(this.#pos);
	}
	
	get endSite() {
		return this.#endSite;
	}

	/**
	 * @param {Site} site
	 */
	setEndSite(site) {
		this.#endSite = site;
	}

	get codeMapSite() {
		return this.#codeMapSite;
	}

	/**
	 * @param {Site} site 
	 */
	setCodeMapSite(site) {
		this.#codeMapSite = site;
	}

	/**
	 * Returns a SyntaxError
	 * @param {string} info 
	 * @returns {UserError}
	 */
	syntaxError(info = "") {
		return UserError.syntaxError(this.#src, this.#pos, info);
	}

	/**
	 * Returns a TypeError
	 * @param {string} info
	 * @returns {UserError}
	 */
	typeError(info = "") {
		return UserError.typeError(this.#src, this.#pos, info);
	}

	/**
	 * Returns a ReferenceError
	 * @param {string} info 
	 * @returns {UserError}
	 */
	referenceError(info = "") {
		return UserError.referenceError(this.#src, this.#pos, info);
	}

	/**
	 * Returns a RuntimeError
	 * @param {string} info
	 * @returns {UserError}
	 */
	runtimeError(info = "") {
		return UserError.runtimeError(this.#src, this.#pos, info);
	}

	/**
	 * Calculates the column,line position in 'this.#src'
	 * @returns {[number, number]}
	 */
	getFilePos() {
		return this.#src.posToColAndLine(this.#pos);
	}
}


//////////////////////////////////
// Section 3: Plutus-Core builtins
//////////////////////////////////

/**
 * NetworkParams contains all protocol parameters. These are needed to do correct, up-to-date, cost calculations.
 */
export class NetworkParams {
	#raw;

	/**
	 * @param {Object} raw 
	 */
	constructor(raw) {
		this.#raw = raw;
	}
	
	get costModel() {
		return assertDefined(this.#raw?.latestParams?.costModels?.PlutusScriptV2, "'obj.latestParams.costModels.PlutusScriptV2' undefined");
	}
	/**
	 * @param {string} key 
	 * @returns {number}
	 */
	getCostModelParameter(key) {
		return assertNumber(this.costModel[key], `'obj.${key}' undefined`);
	}

	/**
	 * @param {string} name 
	 * @returns {Cost}
	 */
	getTermCost(name) {
		let memKey = `cek${name}Cost-exBudgetMemory`;
		let cpuKey = `cek${name}Cost-exBudgetCPU`;

		return {
			mem: BigInt(assertNumber(this.costModel[memKey], `'obj.${memKey}' undefined`)),
			cpu: BigInt(assertNumber(this.costModel[cpuKey], `'obj.${cpuKey}' undefined`)),
		};
	}

	/**
	 * @type {Cost}
	 */
	get plutusCoreStartupCost() {
		return this.getTermCost("Startup");
	}

	/**
	 * @type {Cost}
	 */
	get plutusCoreVariableCost() {
		return this.getTermCost("Var");
	}

	/**
	 * @type {Cost}
	 */
	get plutusCoreLambdaCost() {
		return this.getTermCost("Lam");
	}

	/**
	 * @type {Cost}
	 */
	get plutusCoreDelayCost() {
		return this.getTermCost("Delay");
	}

	/**
	 * @type {Cost}
	 */
	get plutusCoreCallCost() {
		return this.getTermCost("Apply");
	}

	/**
	 * @type {Cost}
	 */
	get plutusCoreConstCost() {
		return this.getTermCost("Const");
	}

	/**
	 * @type {Cost}
	 */
	get plutusCoreForceCost() {
		return this.getTermCost("Force");
	}

	/**
	 * @type {Cost}
	 */
	get plutusCoreBuiltinCost() {
		return this.getTermCost("Builtin");
	}

	/**
	 * @type {[number, number]} - a + b*size
	 */
	get txFeeParams() {
		return [
			assertNumber(this.#raw?.latestParams?.txFeeFixed),
			assertNumber(this.#raw?.latestParams?.txFeePerByte),
		];
	}

	/**
	 * @type {[number, number]} - [memFee, cpuFee]
	 */
	get exFeeParams() {
		return [
			assertNumber(this.#raw?.latestParams?.executionUnitPrices?.priceMemory),
			assertNumber(this.#raw?.latestParams?.executionUnitPrices?.priceSteps),
		];
	}
	
	/**
	 * @type {number[]}
	 */
	get sortedCostParams() {
		let baseObj = this.#raw?.latestParams?.costModels?.PlutusScriptV2;
		let keys = Object.keys(baseObj);

		keys.sort();

		return keys.map(key => assertNumber(baseObj[key]));
	}

	/**
	 * @type {number}
	 */
	get lovelacePerUTXOByte() {
		return assertNumber(this.#raw?.latestParams?.utxoCostPerByte);
	}

	/**
	 * @type {number}
	 */
	get minCollateralPct() {
		return assertNumber(this.#raw?.latestParams?.collateralPercentage);
	}

	/**
	 * @type {[number, number]} - [mem, cpu]
	 */
	get txExecutionBudget() {
		return [
			assertNumber(this.#raw?.latestParams?.maxTxExecutionUnits?.memory),
			assertNumber(this.#raw?.latestParams?.maxTxExecutionUnits?.steps),
		];
	}

	/**
	 * @type {number}
	 */
	get maxTxSize() {
		return assertNumber(this.#raw?.latestParams?.maxTxSize);
	}

	/**
	 * Use the latest slot in networkParameters to determine time
	 * @param {bigint} slot
	 * @returns {bigint}
	 */
	slotToTime(slot) {
		let secondsPerSlot = assertNumber(this.#raw?.shelleyGenesis?.slotLength);

		let lastSlot = BigInt(assertNumber(this.#raw?.latestTip?.slot));
		let lastTime = BigInt(assertNumber(this.#raw?.latestTip?.time)); // in ms

		let slotDiff = slot - lastSlot;

		return lastTime + slotDiff*BigInt(secondsPerSlot*1000);
	}

	/**
	 * Use the latest slot in network parameters to determine slot
	 * @param {bigint} time - milliseconds since 1970
	 * @returns {bigint}
	 */
	timeToSlot(time) {
		let secondsPerSlot = assertNumber(this.#raw?.shelleyGenesis?.slotLength);

		let lastSlot = BigInt(assertNumber(this.#raw?.latestTip?.slot));
		let lastTime = BigInt(assertNumber(this.#raw?.latestTip?.time));

		let timeDiff = lastTime - time;

		return lastSlot + BigInt(Math.round(Number(timeDiff)/(1000*secondsPerSlot)));
	}
}

/**
 * Each builtin has an associated CostModel.
 * The CostModel calculates the execution cost of a builtin, depending on the byte-size of the inputs.
 */
class CostModel {
	constructor() {
	}

	/**
	 * @param {NetworkParams} params
	 * @param {string} baseName
	 * @returns {CostModel}
	 */
	static fromParams(params, baseName) {
		throw new Error("not yet implemented");
	}

	/**
	 * @param {number[]} args 
	 * @returns {bigint}
	 */
	calc(args) {
		throw new Error("not yet implemented");
	}
}

class ConstCost extends CostModel {
	#constant;

	/**
	 * @param {bigint} constant
	 */
	constructor(constant) {
		super();
		this.#constant = constant;
	}

	/**
	 * @param {NetworkParams} params 
	 * @param {string} baseName - eg. addInteger-cpu-arguments
	 * @returns {ConstCost}
	 */
	static fromParams(params, baseName) {
		let a = params.getCostModelParameter(`${baseName}`);

		return new ConstCost(BigInt(a));
	}

	/**
	 * @param {number[]} args
	 * @returns {bigint}
	 */
	calc(args) {
		return this.#constant;
	}
}

class LinearCost extends CostModel {
	#a;
	#b;

	/**
	 * a + b*SizeFn(x, y)
	 * @param {bigint} a - intercept
	 * @param {bigint} b - slope
	 */
	constructor(a, b) {
		super();
		this.#a = a;
		this.#b = b;
	}

	/**
	 * @param {NetworkParams} params 
	 * @param {string} baseName - eg. addInteger-cpu-arguments
	 * @returns {[bigint, bigint]}
	 */
	static getParams(params, baseName) {
		let a = params.getCostModelParameter(`${baseName}-intercept`);
		let b = params.getCostModelParameter(`${baseName}-slope`);

		return [BigInt(a), BigInt(b)];
	}

	/**
	 * @param  {number} size
	 * @returns {bigint}
	 */
	calcInternal(size) {
		return this.#a + this.#b*BigInt(size);
	}
}

class ArgSizeCost extends LinearCost {
	#i;

	/**
	 * @param {bigint} a
	 * @param {bigint} b
	 * @param {number} i - index of the arg
	 */
    constructor(a, b, i) {
	   	super(a, b);
		this.#i = i;
    }

	/**
	 * @param {number[]} args
	 * @returns {bigint}
	 */
	calc(args) {
		assert(this.#i < args.length && this.#i >= 0);

		return this.calcInternal(args[this.#i]);
	}
}

class Arg0SizeCost extends ArgSizeCost {
	/**
	 * @param {bigint} a 
	 * @param {bigint} b 
	 */
	constructor(a, b) {
		super(a, b, 0);
	}

	/**
	 * @param {NetworkParams} params 
	 * @param {string} baseName - eg. addInteger-cpu-arguments
	 * @returns {Arg0SizeCost}
	 */
	 static fromParams(params, baseName) {
		let [a, b] = LinearCost.getParams(params, baseName);

		return new Arg0SizeCost(a, b);
	}
}

class Arg1SizeCost extends ArgSizeCost {
	/**
	 * @param {bigint} a 
	 * @param {bigint} b 
	 */
	constructor(a, b) {
		super(a, b, 1);
	}

	/**
	 * @param {NetworkParams} params 
	 * @param {string} baseName - eg. addInteger-cpu-arguments
	 * @returns {Arg0SizeCost}
	 */
	 static fromParams(params, baseName) {
		let [a, b] = LinearCost.getParams(params, baseName);

		return new Arg1SizeCost(a, b);
	}
}

class Arg2SizeCost extends ArgSizeCost {
	/**
	 * @param {bigint} a 
	 * @param {bigint} b 
	 */
	constructor(a, b) {
		super(a, b, 2);
	}

	/**
	 * @param {NetworkParams} params 
	 * @param {string} baseName - eg. addInteger-cpu-arguments
	 * @returns {Arg0SizeCost}
	 */
	 static fromParams(params, baseName) {
		let [a, b] = LinearCost.getParams(params, baseName);

		return new Arg2SizeCost(a, b);
	}
}

class MinArgSizeCost extends LinearCost {
	/**
	 * a + b*min(args)
	 * @param {bigint} a - intercept
	 * @param {bigint} b - slope
	 */
	constructor(a, b) {
		super(a, b);
	}
	/**
	 * @param {NetworkParams} params 
	 * @param {string} baseName - eg. addInteger-cpu-arguments
	 * @returns {MaxArgSizeCost}
	 */
	static fromParams(params, baseName) {
		let [a, b] = LinearCost.getParams(params, baseName);

		return new MinArgSizeCost(a, b);
	}

	/**
	 * @param  {number[]} args
	 * @returns {bigint}
	 */
	calc(args) {
		let min = args[0];

		for (let arg of args) {
			min = Math.min(arg, min);
		}

		return this.calcInternal(min);
	}
}

class MaxArgSizeCost extends LinearCost {
	/**
	 * a + b*max(args)
	 * @param {bigint} a - intercept
	 * @param {bigint} b - slope
	 */
	constructor(a, b) {
		super(a, b);
	}

	/**
	 * @param {NetworkParams} params 
	 * @param {string} baseName - eg. addInteger-cpu-arguments
	 * @returns {MaxArgSizeCost}
	 */
	static fromParams(params, baseName) {
		let [a, b] = LinearCost.getParams(params, baseName);

		return new MaxArgSizeCost(a, b);
	}

	/**
	 * @param  {number[]} args
	 * @returns {bigint}
	 */
	calc(args) {
		let max = args[0];

		for (let arg of args) {
			max = Math.max(arg, max);
		}

		return this.calcInternal(max);
	}
}

class SumArgSizesCost extends LinearCost {
	/**
	 * a + b*sum(args)
	 * @param {bigint} a - intercept
	 * @param {bigint} b - slope
	 */
	 constructor(a, b) {
		super(a, b);
	}

	/**
	 * @param {NetworkParams} params 
	 * @param {string} baseName - eg. addInteger-cpu-arguments
	 * @returns {MaxArgSizeCost}
	 */
	static fromParams(params, baseName) {
		let [a, b] = LinearCost.getParams(params, baseName);

		return new SumArgSizesCost(a, b);
	}

	/**
	 * @param  {number[]} args
	 * @returns {bigint}
	 */
	calc(args) {
		let sum = 0;

		for (let arg of args) {
			sum += arg;
		}

		return this.calcInternal(sum);
	}
}

class ArgSizeDiffCost extends LinearCost {
	#min;

	/**
	 * a + b*max(x-y, min)
	 * @param {bigint} a - intercept
	 * @param {bigint} b - slope
	 * @param {number} min
	 */
	constructor(a, b, min) {
		super(a, b);
		this.#min = min
	}
	/**
	 * @param {NetworkParams} params 
	 * @param {string} baseName - eg. addInteger-cpu-arguments
	 * @returns {ArgSizeDiffCost}
	 */
	static fromParams(params, baseName) {
		let [a, b] = LinearCost.getParams(params, baseName);
		let min = params.getCostModelParameter(`${baseName}-minimum`);

		return new ArgSizeDiffCost(a, b, min);
	}

	/**
	 * @param {number[]} args
	 * @returns {bigint}
	 */
	calc(args) {
		assert(args.length == 2);
		let [x, y] = args;

		return this.calcInternal(Math.max(x - y, this.#min));
	}
}

class ArgSizeProdCost extends LinearCost {
	#constant;

	/**
	 * (x > y) ? constant : a + b*x*y
	 * @param {bigint} a
	 * @param {bigint} b
	 * @param {bigint} constant
 	 */
	constructor(a, b, constant) {
		super(a, b);
		this.#constant = constant;
	}

	/**
	 * @param {NetworkParams} params 
	 * @param {string} baseName - eg. addInteger-cpu-arguments
	 * @returns {MaxArgSizeCost}
	 */
	static fromParams(params, baseName) {
		let [a, b] = LinearCost.getParams(params, `${baseName}-model-arguments`);
		let constant = params.getCostModelParameter(`${baseName}-constant`);

		return new ArgSizeProdCost(a, b, BigInt(constant));
	}

	/**
	 * @param {number[]} args
	 * @returns {bigint}
	 */
	calc(args) {
		assert(args.length == 2);
		
		let [x, y] = args;

		if (x > y) {
			return this.#constant;
		} else {
			return this.calcInternal(x*y);
		}
	}
}

class ArgSizeDiagCost extends LinearCost {
	#constant;

	/**
	 * @param {bigint} a
	 * @param {bigint} b
	 * @param {bigint} constant
	 */
	constructor(a, b, constant) {
		super(a, b);
		this.#constant = constant;
	}
	/**
	 * @param {NetworkParams} params 
	 * @param {string} baseName - eg. addInteger-cpu-arguments
	 * @returns {ArgSizeDiagCost}
	 */
	static fromParams(params, baseName) {
		let [a, b] = LinearCost.getParams(params, baseName);
		let constant = params.getCostModelParameter(`${baseName}-constant`);

		return new ArgSizeDiagCost(a, b, BigInt(constant));
	}

	/**
	 * @param {number[]} args 
	 * @returns {bigint}
	 */
	calc(args) {
		assert(args.length == 2);

		if (args[0] == args[1]) {
			return this.calcInternal(args[0]);
		} else {
			return this.#constant;
		}
	}
}

/**
 * @typedef CostModelClass
 * @property {(params: NetworkParams, baseName: string) => CostModel} fromParams
 */

class PlutusCoreBuiltinInfo {
	#name;
	#forceCount;
	#memCostModelClass;
	#cpuCostModelClass;

	/**
	 * @param {string} name 
	 * @param {number} forceCount - number of type parameters of a plutus-core builtin function (0, 1 or 2)
	 * @param {CostModelClass} memCostModelClass 
	 * @param {CostModelClass} cpuCostModelClass 
	 */
	constructor(name, forceCount, memCostModelClass, cpuCostModelClass) {
		this.#name = name;
		this.#forceCount = forceCount;
		this.#memCostModelClass = memCostModelClass;
		this.#cpuCostModelClass = cpuCostModelClass;
	}

	get name() {
		return this.#name;
	}

	get forceCount() {
		return this.#forceCount;
	}

	/**
	 * @param {NetworkParams} params
	 * @returns {[CostModel, CostModel]}
	 */
	instantiateCostModels(params) {
		if (this.#memCostModelClass !== null && this.#cpuCostModelClass !== null) {
			let memCostModel = this.#memCostModelClass.fromParams(params, `${this.#name}-memory-arguments`);
			let cpuCostModel = this.#cpuCostModelClass.fromParams(params, `${this.#name}-cpu-arguments`);

			return [memCostModel, cpuCostModel];
		} else {
			throw new Error(`cost model not yet implemented for builtin ${this.#name}`);
		}
	}

	/**
	 * @param {NetworkParams} params
	 * @param {number[]} argSizes
	 * @returns {Cost}
	 */
	calcCost(params, argSizes) {
		// Note: instantiating everytime might be slow. Should this be cached (eg. in the params object?)?
		let [memCostModel, cpuCostModel] = this.instantiateCostModels(params);

		let memCost = memCostModel.calc(argSizes);
		let cpuCost = cpuCostModel.calc(argSizes);

		return {mem: memCost, cpu: cpuCost};
	}
}

/** 
 * A list of all PlutusScript builins, with associated costmodels (actual costmodel parameters are loaded from NetworkParams during runtime)
 * @type {PlutusCoreBuiltinInfo[]} 
 */
const PLUTUS_CORE_BUILTINS = (
	/**
	 * @returns {PlutusCoreBuiltinInfo[]}
	 */
	function () {
		/**
		 * Constructs a builtinInfo object
		 * @param {string} name 
		 * @param {number} forceCount 
		 * @param {CostModelClass} memCostModel
		 * @param {CostModelClass} cpuCostModel
		 * @returns {PlutusCoreBuiltinInfo}
		 */
		function builtinInfo(name, forceCount, memCostModel, cpuCostModel) {
			// builtins might need be wrapped in `force` a number of times if they are not fully typed
			return new PlutusCoreBuiltinInfo(name, forceCount, memCostModel, cpuCostModel);
		}

		return [
			builtinInfo("addInteger",               0, MaxArgSizeCost, MaxArgSizeCost), // 0
			builtinInfo("subtractInteger",          0, MaxArgSizeCost, MaxArgSizeCost),
			builtinInfo("multiplyInteger",          0, SumArgSizesCost, SumArgSizesCost),
			builtinInfo("divideInteger",            0, ArgSizeDiffCost, ArgSizeProdCost),
			builtinInfo("quotientInteger",          0, ArgSizeDiffCost, ArgSizeProdCost), 
			builtinInfo("remainderInteger",         0, ArgSizeDiffCost, ArgSizeProdCost),
			builtinInfo("modInteger",               0, ArgSizeDiffCost, ArgSizeProdCost),
			builtinInfo("equalsInteger",            0, ConstCost, MinArgSizeCost),
			builtinInfo("lessThanInteger",          0, ConstCost, MinArgSizeCost),
			builtinInfo("lessThanEqualsInteger",    0, ConstCost, MinArgSizeCost),
			builtinInfo("appendByteString",         0, SumArgSizesCost, SumArgSizesCost), // 10
			builtinInfo("consByteString",           0, SumArgSizesCost, Arg1SizeCost),
			builtinInfo("sliceByteString",          0, Arg2SizeCost, Arg2SizeCost),
			builtinInfo("lengthOfByteString",       0, ConstCost, ConstCost),
			builtinInfo("indexByteString",          0, ConstCost, ConstCost),
			builtinInfo("equalsByteString",         0, ConstCost, ArgSizeDiagCost),
			builtinInfo("lessThanByteString",       0, ConstCost, MinArgSizeCost),
			builtinInfo("lessThanEqualsByteString", 0, ConstCost, MinArgSizeCost),
			builtinInfo("sha2_256",                 0, ConstCost, Arg0SizeCost),
			builtinInfo("sha3_256",                 0, ConstCost, Arg0SizeCost),
			builtinInfo("blake2b_256",              0, ConstCost, Arg0SizeCost), // 20
			builtinInfo("verifyEd25519Signature",   0, ConstCost, Arg2SizeCost),
			builtinInfo("appendString",             0, SumArgSizesCost, SumArgSizesCost),
			builtinInfo("equalsString",             0, ConstCost, ArgSizeDiagCost),
			builtinInfo("encodeUtf8",               0, Arg0SizeCost, Arg0SizeCost),
			builtinInfo("decodeUtf8",               0, Arg0SizeCost, Arg0SizeCost),
			builtinInfo("ifThenElse",               1, ConstCost, ConstCost),
			builtinInfo("chooseUnit",               1, ConstCost, ConstCost),
			builtinInfo("trace",                    1, ConstCost, ConstCost),
			builtinInfo("fstPair",                  2, ConstCost, ConstCost),
			builtinInfo("sndPair",                  2, ConstCost, ConstCost), // 30
			builtinInfo("chooseList",               1, ConstCost, ConstCost),
			builtinInfo("mkCons",                   1, ConstCost, ConstCost),
			builtinInfo("headList",                 1, ConstCost, ConstCost),
			builtinInfo("tailList",                 1, ConstCost, ConstCost),
			builtinInfo("nullList",                 1, ConstCost, ConstCost),
			builtinInfo("chooseData",               0, ConstCost, ConstCost),
			builtinInfo("constrData",               0, ConstCost, ConstCost),
			builtinInfo("mapData",                  0, ConstCost, ConstCost),
			builtinInfo("listData",                 0, ConstCost, ConstCost),
			builtinInfo("iData",                    0, ConstCost, ConstCost), // 40
			builtinInfo("bData",                    0, ConstCost, ConstCost),
			builtinInfo("unConstrData",             0, ConstCost, ConstCost),
			builtinInfo("unMapData",                0, ConstCost, ConstCost),
			builtinInfo("unListData",               0, ConstCost, ConstCost),
			builtinInfo("unIData",                  0, ConstCost, ConstCost),
			builtinInfo("unBData",                  0, ConstCost, ConstCost),
			builtinInfo("equalsData",               0, ConstCost, MinArgSizeCost),
			builtinInfo("mkPairData",               0, ConstCost, ConstCost),
			builtinInfo("mkNilData",                0, ConstCost, ConstCost),
			builtinInfo("mkNilPairData",            0, ConstCost, ConstCost), // 50
			builtinInfo("serialiseData",            0, Arg0SizeCost, Arg0SizeCost),
			builtinInfo("verifyEcdsaSecp256k1Signature",   0, ConstCost, ConstCost), // these parameters are from aiken, but the cardano-cli parameter file differ?
			builtinInfo("verifySchnorrSecp256k1Signature", 0, ConstCost, Arg1SizeCost), // these parameters are from, but the cardano-cli parameter file differs?
		];
	}
)();


/////////////////////////////////////
// Section 4: Plutus-Core AST objects
/////////////////////////////////////

/** 
 * a PlutusCoreValue is passed around by PlutusCore expressions.
 */
class PlutusCoreValue {
	#site;

	/**
	 * @param {Site} site 
	 */
	constructor(site) {
		assert(site != undefined && (site instanceof Site));
		this.#site = site;
	}

	/**
	 * Return a copy of the PlutusCoreValue at a different Site.
	 * @param {Site} newSite 
	 * @returns {PlutusCoreValue}
	 */
	copy(newSite) {
		throw new Error("not implemented");
	}

	get site() {
		return this.#site;
	}

	/**
	 * Size in words (8 bytes, 64 bits) occupied in target node
	 * @type {number}
	 */
	get memSize() {
		throw new Error("not yet implemented");
	}

	/**
	 * Throws an error because most values can't be called (overridden by PlutusCoreAnon)
	 * @param {PlutusCoreRTE | PlutusCoreStack} rte 
	 * @param {Site} site 
	 * @param {PlutusCoreValue} value
	 * @returns {Promise<PlutusCoreValue>}
	 */
	async call(rte, site, value) {
		throw site.typeError(`expected a UPLC function, got '${this.toString()}'`);
	}

	/**
	 * @param {PlutusCoreRTE | PlutusCoreStack} rte 
	 * @returns {Promise<PlutusCoreValue>}
	 */
	async eval(rte) {
		return this;
	}

	/**
	 * @type {bigint}
	 */
	get int() {
		throw this.site.typeError(`expected a UPLC int, got '${this.toString()}'`);
	}

	/**
	 * @type {number[]}
	 */
	get bytes() {
		throw this.site.typeError(`expected a UPLC bytearray, got '${this.toString()}'`);
	}

	/**
	 * @type {string}
	 */
	get string() {
		throw this.site.typeError(`expected a UPLC string, got '${this.toString()}'`);
	}
	
	/**
	 * @type {boolean}
	 */
	get bool() {
		throw this.site.typeError(`expected a UPLC bool, got '${this.toString()}'`);
	}

	/**
	 * Distinguishes a pair from a mapItem
	 * @returns {boolean}
	 */
	isPair() {
		return false;
	}

	/**
	 * @type {PlutusCoreValue}
	 */
	get first() {
		throw this.site.typeError(`expected a UPLC pair, got '${this.toString()}'`);
	}

	/**
	 * @type {PlutusCoreValue}
	 */
	get second() {
		throw this.site.typeError(`expected a UPLC pair, got '${this.toString()}'`);
	}

	/**
	 * Distinguishes a mapItem from a pair
	 * @returns {boolean}
	 */
	isMapItem() {
		return false;
	}

	/**
	 * @type {PlutusCoreData}
	 */
	get key() {
		throw this.site.typeError(`expected a UPLC data-pair, got '${this.toString()}'`);
	}

	/**
	 * @type {PlutusCoreData}
	 */
	get value() {
		throw this.site.typeError(`expected a UPLC data-pair_, got '${this.toString()}'`);
	}

	/**
	 * Distinguishes a list from a map
	 * @returns {boolean}
	 */
	isList() {
		return false;
	}

	/**
	 * DIstinguishes a map from a list
	 * @returns {boolean}
	 */
	isMap() {
		return false;
	}

	/**
	 * @type {PlutusCoreData[]}
	 */
	get list() {
		throw this.site.typeError(`expected a UPLC list, got '${this.toString()}'`);
	}

	/**
	 * @type {PlutusCoreMapItem[]}
	 */
	get map() {
		throw this.site.typeError(`expected a UPLC map '${this.toString()}'`);
	}

	isData() {
		return false;
	}

	/**
	 * @type {PlutusCoreData}
	 */
	get data() {
		throw this.site.typeError(`expected UPLC data, got '${this.toString()}'`);
	}

	/**
	 * @returns {PlutusCoreUnit}
	 */
	assertUnit() {
		throw this.site.typeError(`expected UPLC unit, got '${this.toString}'`);
	}

	/**
	 * @returns {string}
	 */
	toString() {
		throw new Error("toString not implemented");
	}

	/**
	 * @returns {string}
	 */
	typeBits() {
		throw new Error("not yet implemented");
	}

	/**
	 * Encodes value without type header
	 */
	toFlatValueInternal(bitWriter) {
		throw new Error("not yet implemented");
	}

	/**
	 * Encodes value with plutus flat encoding.
	 * Member function not named 'toFlat' as not to confuse with 'toFlat' member of terms.
	 * @param {BitWriter} bitWriter
	 */
	toFlatValue(bitWriter) {
		bitWriter.write('1' + this.typeBits() + '0');
		
		this.toFlatValueInternal(bitWriter);
	}
}

/**
* @typedef {object} PlutusCoreRTECallbacks
* @property {(msg: string) => Promise<void>} [onPrint]
* @property {(site: Site, rawStack: PlutusCoreRawStack) => Promise<boolean>} [onStartCall]
* @property {(site: Site, rawStack: PlutusCoreRawStack) => Promise<void>} [onEndCall]
* @property {(cost: Cost) => void} [onIncrCost]
*/

/**
 * @type {PlutusCoreRTECallbacks}
 */
const DEFAULT_PLUTUS_CORE_RTE_CALLBACKS = {
	onPrint: async function (msg) {return},
	onStartCall: async function(site, rawStack) {return false},
	onEndCall: async function(site, rawStack) {return},
	onIncrCost: function(cost) {return},
}

/**
 * PlutusCore Runtime Environment is used for controlling the programming evaluation (eg. by a debugger)
 */
class PlutusCoreRTE {
	#callbacks;

	#networkParams;

	/**
	 * this.onNotifyCalls is set to 'false' when the debugger is in step over-mode.
	 * @type {boolean}
	 */
	#notifyCalls;

	/**
	 * this.onNotifyCalls is set back to true if the endCall is called with the same rawStack as the marker.
	 * @type {?PlutusCoreRawStack}
	 */
	#marker;

	/**
	 * @typedef {[?string, PlutusCoreValue][]} PlutusCoreRawStack
	 */

	/**
	 * @param {PlutusCoreRTECallbacks} callbacks 
	 * @param {?NetworkParams} networkParams
	 */
	constructor(callbacks = DEFAULT_PLUTUS_CORE_RTE_CALLBACKS, networkParams = null) {
		assertDefined(callbacks);
		this.#callbacks = callbacks;
		this.#networkParams = networkParams;
		this.#notifyCalls = true;
		this.#marker = null;
	}

	/**
	 * @param {Cost} cost 
	 */
	incrCost(cost) {
		if (this.#callbacks.onIncrCost !== undefined) {
			this.#callbacks.onIncrCost(cost);
		}
	}

	incrStartupCost() {
		if (this.#networkParams !== null) {
			this.incrCost(this.#networkParams.plutusCoreStartupCost);
		}
	}

	incrVariableCost() {
		if (this.#networkParams !== null) {
			this.incrCost(this.#networkParams.plutusCoreVariableCost);
		}
	}

	incrLambdaCost() {
		if (this.#networkParams !== null) {
			this.incrCost(this.#networkParams.plutusCoreLambdaCost);
		}
	}

	incrDelayCost() {
		if (this.#networkParams !== null) {
			this.incrCost(this.#networkParams.plutusCoreDelayCost);
		}
	}

	incrCallCost() {
		if (this.#networkParams !== null) {
			this.incrCost(this.#networkParams.plutusCoreCallCost);
		}
	}

	incrConstCost() {
		if (this.#networkParams !== null) {
			this.incrCost(this.#networkParams.plutusCoreConstCost);
		}
	}

	incrForceCost() {
		if (this.#networkParams !== null) {
			this.incrCost(this.#networkParams.plutusCoreForceCost);
		}
	}

	incrBuiltinCost() {
		if (this.#networkParams !== null) {
			this.incrCost(this.#networkParams.plutusCoreBuiltinCost);
		}
	}

	/**
	 * @param {PlutusCoreBuiltin} fn
	 * @param {PlutusCoreValue[]} args
	 */
	calcAndIncrCost(fn, ...args) {
		if (this.#networkParams !== null) {
			let cost = fn.calcCost(this.#networkParams, ...args);

			this.incrCost(cost);
		}
	}

	/**
	 * Gets variable using Debruijn index. Throws error here because PlutusCoreRTE is the stack root and doesn't contain any values.
	 * @param {number} i 
	 * @returns {PlutusCoreValue}
	 */
	get(i) {
		throw new Error("variable index out of range");
	}

	/**
	 * Creates a child stack.
	 * @param {PlutusCoreValue} value 
	 * @param {?string} valueName 
	 * @returns {PlutusCoreStack}
	 */
	push(value, valueName = null) {
		return new PlutusCoreStack(this, value, valueName);
	}

	/**
	 * Calls the print callback (or does nothing if print callback isn't defined)
	 * @param {string} msg 
	 * @returns {Promise<void>}
	 */
	async print(msg) {
		if (this.#callbacks.onPrint != undefined) {
			await this.#callbacks.onPrint(msg);
		}
	}

	/**
	 * Calls the onStartCall callback.
	 * @param {Site} site 
	 * @param {PlutusCoreRawStack} rawStack 
	 * @returns {Promise<void>}
	 */
	async startCall(site, rawStack) {
		if (this.#notifyCalls && this.#callbacks.onStartCall != undefined) {
			let stopNotifying = await this.#callbacks.onStartCall(site, rawStack);
			if (stopNotifying) {
				this.#notifyCalls = false;
				this.#marker = rawStack;
			}
		}
	}

	/**
	 * Calls the onEndCall callback if '#notifyCalls == true'.
	 * '#notifyCalls' is set to true if 'rawStack == #marker'.
	 * @param {Site} site 
	 * @param {PlutusCoreRawStack} rawStack 
	 * @param {PlutusCoreValue} result 
	 * @returns {Promise<void>}
	 */
	async endCall(site, rawStack, result) {
		if (!this.#notifyCalls && this.#marker == rawStack) {
			this.#notifyCalls = true;
			this.#marker = null;
		}

		if (this.#notifyCalls && this.#callbacks.onEndCall != undefined) {
			rawStack = rawStack.slice();
			rawStack.push(["__result", result]);
			await this.#callbacks.onEndCall(site, rawStack);
		}
	}

	/**
	 * @returns {PlutusCoreRawStack}
	 */
	toList() {
		return [];
	}
}

/**
 * PlutusCoreStack contains a value that can be retrieved using a Debruijn index.
 */
class PlutusCoreStack {
	#parent;
	#value;
	#valueName;

	/**
	 * @param {(?PlutusCoreStack) | PlutusCoreRTE} parent
	 * @param {?PlutusCoreValue} value
	 * @param {?string} valueName
	 */
	constructor(parent, value = null, valueName = null) {
		this.#parent = parent;
		this.#value = value;
		this.#valueName = valueName;
	}

	incrStartupCost() {
		if (this.#parent !== null) {
			this.#parent.incrStartupCost()
		}
	}

	incrVariableCost() {
		if (this.#parent !== null) {
			this.#parent.incrVariableCost()
		}
	}

	incrLambdaCost() {
		if (this.#parent !== null) {
			this.#parent.incrLambdaCost()
		}
	}
	
	incrDelayCost() {
		if (this.#parent !== null) {
			this.#parent.incrDelayCost();
		}
	}

	incrCallCost() {
		if (this.#parent !== null) {
			this.#parent.incrCallCost();
		}
	}

	incrConstCost() {
		if (this.#parent !== null) {
			this.#parent.incrConstCost();
		}
	}

	incrForceCost() {
		if (this.#parent !== null) {
			this.#parent.incrForceCost()
		}
	}

	incrBuiltinCost() {
		if (this.#parent !== null) {
			this.#parent.incrBuiltinCost()
		}
	}

	/**
	 * @param {PlutusCoreBuiltin} fn
	 * @param {PlutusCoreValue[]} args
	 */
	calcAndIncrCost(fn, ...args) {
		if (this.#parent !== null) {
			this.#parent.calcAndIncrCost(fn, ...args);
		}
	}

	/**
	 * Gets a value using the Debruijn index. If 'i == 1' then the current value is returned.
	 * Otherwise 'i' is decrement and passed to the parent stack.
	 * @param {number} i 
	 * @returns {PlutusCoreValue}
	 */
	get(i) {
		i -= 1;

		if (i == 0) {
			if (this.#value === null) {
				throw new Error("plutus-core stack value not set");
			} else {
				return this.#value;
			}
		} else {
			assert(i > 0);
			if (this.#parent === null) {
				throw new Error("variable index out of range");
			} else {
				return this.#parent.get(i);
			}
		}
	}

	/**
	 * Instantiates a child stack.
	 * @param {PlutusCoreValue} value 
	 * @param {?string} valueName 
	 * @returns {PlutusCoreStack}
	 */
	push(value, valueName = null) {
		return new PlutusCoreStack(this, value, valueName);
	}

	/**
	 * Calls the onPrint callback in the RTE (root of stack).
	 * @param {string} msg 
	 * @returns {Promise<void>}
	 */
	async print(msg) {
		if (this.#parent !== null) {
			await this.#parent.print(msg);
		}
	}

	/**
	 * Calls the onStartCall callback in the RTE (root of stack).
	 * @param {Site} site 
	 * @param {PlutusCoreRawStack} rawStack 
	 * @returns {Promise<void>}
	 */
	async startCall(site, rawStack) {
		if (this.#parent !== null) {
			await this.#parent.startCall(site, rawStack);
		}
	}

	/** 
	 * Calls the onEndCall callback in the RTE (root of stack).
	 * @param {Site} site
	 * @param {PlutusCoreRawStack} rawStack
	 * @param {PlutusCoreValue} result
	 * @returns {Promise<void>}
	*/
	async endCall(site, rawStack, result) {
		if (this.#parent !== null) {
			await this.#parent.endCall(site, rawStack, result);
		}
	}

	/** 
	 * @returns {PlutusCoreRawStack}
	*/
	toList() {
		let lst = this.#parent !== null ? this.#parent.toList() : [];
		if (this.#value !== null) {
			lst.push([this.#valueName, this.#value]);
		}
		return lst;
	}
}

/**
 * Anonymous PlutusCore function.
 * Returns a new PlutusCoreAnon whenever it is called/applied (args are 'accumulated'), except final application, when the function itself is evaluated.
 */
class PlutusCoreAnon extends PlutusCoreValue {
	/**
	 * @typedef {(callSite: Site, subStack: PlutusCoreStack, ...args: PlutusCoreValue[]) => (PlutusCoreValue | Promise<PlutusCoreValue>)} PlutusCoreAnonCallback
	 */

	#rte;
	#nArgs;
	#argNames;

	/**
	 * Increment every time function a new argument is applied.
	 */
	#argCount;

	/**
	 * Callback that is called when function is fully applied.
	 * @type {PlutusCoreAnonCallback}
	 */
	#fn;
	#callSite;

	/**
	 * 
	 * @param {Site} site 
	 * @param {PlutusCoreRTE | PlutusCoreStack} rte 
	 * @param {string[] | number} args - args can be list of argNames (for debugging), or the number of args
	 * @param {PlutusCoreAnonCallback} fn 
	 * @param {number} argCount 
	 * @param {?Site} callSite 
	 */
	constructor(site, rte, args, fn, argCount = 0, callSite = null) {
		super(site);
		assert(typeof argCount == "number");

		let nArgs = 0;
		/** @type {?string[]} */
		let argNames = null;
		if ((typeof args != 'number')) {
			if (args instanceof Array) {
				nArgs = args.length;
				argNames = args;
			} else {
				throw new Error("not an Array");
			}
		} else {
			nArgs = args;
		}

		assert(nArgs >= 1);

		this.#rte = rte;
		this.#nArgs = nArgs;
		this.#argNames = argNames;
		this.#argCount = argCount;
		this.#fn = fn;
		this.#callSite = callSite;
	}

	get memSize() {
		return 1;
	}

	/**
	 * @param {Site} newSite 
	 * @returns {PlutusCoreAnon}
	 */
	copy(newSite) {
		return new PlutusCoreAnon(
			newSite,
			this.#rte,
			this.#argNames !== null ? this.#argNames : this.#nArgs,
			this.#fn,
			this.#argCount,
			this.#callSite,
		);
	}

	/**
	 * @param {Site} callSite
	 * @param {PlutusCoreStack} subStack
	 * @param {PlutusCoreValue[]} args
	 * @returns {PlutusCoreValue | Promise<PlutusCoreValue>}
	 */
	callSync(callSite, subStack, args) {
		return this.#fn(callSite, subStack, ...args);
	}

	/**
	 * @param {PlutusCoreRTE | PlutusCoreStack} rte 
	 * @param {Site} site 
	 * @param {PlutusCoreValue} value 
	 * @returns {Promise<PlutusCoreValue>}
	 */
	async call(rte, site, value) {
		assert(site != undefined && site instanceof Site);

		let subStack = this.#rte.push(value, this.#argNames !== null ? this.#argNames[this.#argCount] : null); // this is the only place where the stack grows
		let argCount = this.#argCount + 1;
		let callSite = this.#callSite !== null ? this.#callSite : site;

		// function is fully applied, collect the args and call the callback
		if (argCount == this.#nArgs) {
			/** @type {PlutusCoreValue[]} */
			let args = [];

			let rawStack = rte.toList(); // use the RTE of the callsite

			for (let i = this.#nArgs; i >= 1; i--) {
				let argValue = subStack.get(i);
				args.push(argValue);
				rawStack.push([`__arg${this.#nArgs - i}`, argValue]);
			}

			// notify the RTE of the new live stack (list of pairs instead of PlutusCoreStack), and await permission to continue
			await this.#rte.startCall(callSite, rawStack);

			try {
				let result = this.callSync(callSite, subStack, args);

				if (result instanceof Promise) {
					result = await result;
				}
	
				// the same rawStack object can be used as a marker for 'Step-Over' in the debugger
				await this.#rte.endCall(callSite, rawStack, result);
	
				return result.copy(callSite);
			} catch(e) {
				// TODO: a trace can be added to the error here
				throw e;
			}
		} else {
			// function isn't yet fully applied, return a new partially applied PlutusCoreAnon
			assert(this.#nArgs > 1);

			return new PlutusCoreAnon(
				callSite,
				subStack,
				this.#argNames !== null ? this.#argNames : this.#nArgs,
				this.#fn,
				argCount,
				callSite,
			);
		}
	}

	toString() {
		return "fn";
	}
}

/**
 * UPLC Integer class
 */
class PlutusCoreInt extends PlutusCoreValue {
	#value;
	#signed;

	/**
	 * @param {Site} site
	 * @param {bigint} value - supposed to be arbitrary precision
	 * @param {boolean} signed
	 */
	constructor(site, value, signed = true) {
		super(site);
		assert(typeof value == 'bigint', "not a bigint");
		this.#value = value;
		this.#signed = signed;
	}

	/**
	 * Creates a PlutusCoreInt wrapped in a PlutusCoreConst, so it can be used a term
	 * @param {Site} site 
	 * @param {bigint} value 
	 * @returns 
	 */
	static newSignedTerm(site, value) {
		return new PlutusCoreConst(new PlutusCoreInt(site, value, true));
	}

	get memSize() {
		if (this.#value == 0n) {
			return 1;
		} else {
			let abs = this.#value > 0 ? this.#value : -this.#value;

			return Math.floor(Math.floor(Math.log2(Number(abs)))/64) + 1;
		}
	}

	/**
	 * @param {Site} newSite 
	 * @returns 
	 */
	copy(newSite) {
		return new PlutusCoreInt(newSite, this.#value, this.#signed);
	}

	get int() {
		return this.#value;
	}

	/**
	 * Parses a single byte in the Plutus-Core byte-list representation of an int
	 * @param {number} b 
	 * @returns {number}
	 */
	static parseRawByte(b) {
		return b & 0b01111111;
	}

	/**
	 * Returns true if 'b' is the last byte in the Plutus-Core byte-list representation of an int.
	 * @param {number} b 
	 * @returns {boolean}
	 */
	static rawByteIsLast(b) {
		return (b & 0b10000000) == 0;
	}

	/**
	 * Combines a list of Plutus-Core bytes into a bigint (leading bit of each byte is ignored)
	 * @param {number[]} bytes
	 * @returns {bigint}
	 */
	static bytesToBigInt(bytes) {
		let value = BigInt(0);

		let n = bytes.length;

		for (let i = 0; i < n; i++) {
			let b = bytes[i];

			// 7 (not 8), because leading bit isn't used here
			value = value + BigInt(b) * ipow2(BigInt(i) * 7n);
		}

		return value;
	}

	/**
	 * Applies zigzag encoding
	 * @returns {PlutusCoreInt}
	 */
	toUnsigned() {
		if (this.#signed) {
			if (this.#value < 0n) {
				return new PlutusCoreInt(this.site, 1n - this.#value * 2n, false);
			} else {
				return new PlutusCoreInt(this.site, this.#value * 2n, false);
			}
		} else {
			return this;
		}
	}

	/** 
	 * Unapplies zigzag encoding 
	 * @returns {PlutusCoreInt}
	*/
	toSigned() {
		if (this.#signed) {
			return this;
		} else {
			if (this.#value % 2n == 0n) {
				return new PlutusCoreInt(this.site, this.#value / 2n, true);
			} else {
				return new PlutusCoreInt(this.site, -(this.#value + 1n) / 2n, true);
			}
		}
	}

	/**
	 * @returns {string}
	 */
	toString() {
		return this.#value.toString();
	}

	/**
	 * @param {BitWriter} bitWriter
	 */
	toFlatInternal(bitWriter) {
		let zigzag = this.toUnsigned();
		let bitString = padZeroes(zigzag.#value.toString(2), 7);

		// split every 7th
		let parts = [];
		for (let i = 0; i < bitString.length; i += 7) {
			parts.push(bitString.slice(i, i + 7));
		}

		// reverse the parts
		parts.reverse();

		for (let i = 0; i < parts.length; i++) {
			if (i == parts.length - 1) {
				// last
				bitWriter.write('0' + parts[i]);
			} else {
				bitWriter.write('1' + parts[i]);
			}
		}
	}

	/**
	 * Encodes unsigned integer with plutus flat encoding.
	 * Throws error if signed.
	 * Used by encoding plutus core program version and debruijn indices.
	 * @param {BitWriter} bitWriter 
	 */
	toFlatUnsigned(bitWriter) {
		assert(!this.#signed);

		this.toFlatInternal(bitWriter);
	}

	/**
	 * @returns {string}
	 */
	typeBits() {
		return "0000";
	}

	/**
	 * @param {BitWriter} bitWriter 
	 */
	toFlatValueInternal(bitWriter) {
		assert(this.#signed);

		this.toFlatInternal(bitWriter);
	}
}

/**
 * UPLC ByteArray value class
 * Wraps a regular list of uint8 numbers (so not Uint8Array)
 */
class PlutusCoreByteArray extends PlutusCoreValue {
	#bytes;

	/**
	 * @param {Site} site
	 * @param {number[]} bytes
	 */
	constructor(site, bytes) {
		super(site);
		assert(bytes != undefined);
		this.#bytes = bytes;
		for (let b of this.#bytes) {
			assert(typeof b == 'number');
		}
	}

	/**
	 * Creates new PlutusCoreByteArray wrapped in PlutusCoreConst so it can be used as a term.
	 * @param {Site} site 
	 * @param {number[]} bytes 
	 * @returns 
	 */
	static newTerm(site, bytes) {
		return new PlutusCoreConst(new PlutusCoreByteArray(site, bytes));
	}

	get memSize() {
		return Math.floor((this.#bytes.length - 1)/8) + 1;
	}

	/**
	 * @param {Site} newSite 
	 * @returns {PlutusCoreByteArray}
	 */
	copy(newSite) {
		return new PlutusCoreByteArray(newSite, this.#bytes);
	}

	get bytes() {
		return this.#bytes.slice();
	}

	/**
	 * Returns hex representation of byte array
	 * @returns {string}
	 */
	toString() {
		return `#${bytesToHex(this.#bytes)}`;
	}

	/**
	 * @returns {string}
	 */
	typeBits() {
		return "0001";
	}

	/**
	 * @param {BitWriter} bitWriter
	 */
	toFlatValueInternal(bitWriter) {
		PlutusCoreByteArray.writeBytes(bitWriter, this.#bytes);
	}

	/**
	 * Write a list of bytes to the bitWriter using flat encoding.
	 * Used by PlutusCoreString and PlutusCoreByteArray
	 * @param {BitWriter} bitWriter 
	 * @param {number[]} bytes 
	 */
	static writeBytes(bitWriter, bytes) {
		bitWriter.padToByteBoundary(true);

		let n = bytes.length;
		let pos = 0;

		// write chunks of 255
		while (pos < n) {
			let nChunk = Math.min(n - pos, 255);

			bitWriter.write(padZeroes(nChunk.toString(2), 8));

			for (let i = pos; i < pos + nChunk; i++) {
				let b = bytes[i];

				bitWriter.write(padZeroes(b.toString(2), 8));
			}

			pos += nChunk;
		}

		bitWriter.write('00000000');
	}
}

/**
 * UPLC string value class
 */
class PlutusCoreString extends PlutusCoreValue {
	#value;

	/**
	 * @param {Site} site 
	 * @param {string} value 
	 */
	constructor(site, value) {
		super(site);
		this.#value = value;
	}

	/**
	 * Creates a new PlutusCoreString wrapped with PlutusCoreConst so it can be used as a term.
	 * @param {Site} site 
	 * @param {string} value 
	 * @returns {PlutusCoreConst}
	 */
	static newTerm(site, value) {
		return new PlutusCoreConst(new PlutusCoreString(site, value));
	}

	get memSize() {
		return this.#value.length;
	}

	/**
	 * @param {Site} newSite 
	 * @returns {PlutusCoreString}
	 */
	copy(newSite) {
		return new PlutusCoreString(newSite, this.#value);
	}

	get string() {
		return this.#value;
	}

	/**
	 * @returns {string}
	 */
	toString() {
		return `"${this.#value}"`;
	}

	/**
	 * @returns {string}
	 */
	typeBits() {
		return "0010";
	}

	/**
	 * @param {BitWriter} bitWriter
	 */
	toFlatValueInternal(bitWriter) {
		let bytes = Array.from((new TextEncoder()).encode(this.#value));

		PlutusCoreByteArray.writeBytes(bitWriter, bytes);
	}
}

/**
 * UPLC unit value class
 */
 class PlutusCoreUnit extends PlutusCoreValue {
	/**
	 * @param {Site} site 
	 */
	constructor(site) {
		super(site);
	}

	/**
	 * Creates a new PlutusCoreUnit wrapped with PlutusCoreConst so it can be used as a term
	 * @param {Site} site 
	 * @returns {PlutusCoreConst}
	 */
	static newTerm(site) {
		return new PlutusCoreConst(new PlutusCoreUnit(site));
	}

	get memSize() {
		return 1;
	}

	/**
	 * @param {Site} newSite 
	 * @returns {PlutusCoreUnit}
	 */
	copy(newSite) {
		return new PlutusCoreUnit(newSite);
	}

	toString() {
		return "()";
	}

	typeBits() {
		return "0011";
	}

	/**
	 * @param {BitWriter} bitWriter
	 */
	toFlatValueInternal(bitWriter) {
	}

	/**
	 * @returns {PlutusCoreUnit}
	 */
	assertUnit() {
		return this;
	}
}

/**
 * UPLC boolean value class
 */
class PlutusCoreBool extends PlutusCoreValue {
	#value;

	/**
	 * @param {Site} site 
	 * @param {boolean} value 
	 */
	constructor(site, value) {
		super(site);
		this.#value = value;
	}

	/**
	 * Creates a new PlutusCoreBool wrapped with PlutusCoreConst so it can be used as a term.
	 * @param {Site} site 
	 * @param {boolean} value 
	 * @returns {PlutusCoreConst}
	 */
	static newTerm(site, value) {
		return new PlutusCoreConst(new PlutusCoreBool(site, value));
	}

	get memSize() {
		return 1;
	}

	/**
	 * @param {Site} newSite 
	 * @returns {PlutusCoreBool}
	 */
	copy(newSite) {
		return new PlutusCoreBool(newSite, this.#value);
	}

	get bool() {
		return this.#value;
	}

	/**
	 * @type {PlutusCoreData}
	 */
	get data() {
		return new ConstrData(this.#value ? 1 : 0, []);
	}

	/**
	 * @returns {string}
	 */
	toString() {
		return this.#value ? "true" : "false";
	}

	/**
	 * @returns {string}
	 */
	typeBits() {
		return '0100';
	}

	/**
	 * @param {BitWriter} bitWriter
	 */
	toFlatValueInternal(bitWriter) {
		if (this.#value) {
			bitWriter.write('1');
		} else {
			bitWriter.write('0');
		}
	}
}

/**
 * UPLC pair value class
 * Can contain any other value type.
 */
class PlutusCorePair extends PlutusCoreValue {
	#first;
	#second;

	/**
	 * @param {Site} site
	 * @param {PlutusCoreValue} first
	 * @param {PlutusCoreValue} second
	 */
	constructor(site, first, second) {
		super(site);
		this.#first = first;
		this.#second = second;
	}

	/**
	 * Creates a new PlutusCoreBool wrapped with PlutusCoreConst so it can be used as a term.
	 * @param {Site} site 
	 * @param {PlutusCoreValue} first
	 * @param {PlutusCoreValue} second
	 * @returns {PlutusCoreConst}
	 */
 	static newTerm(site, first, second) {
		return new PlutusCoreConst(new PlutusCorePair(site, first, second));
	}

	get memSize() {
		return 1 + this.#first.memSize + this.#second.memSize;
	}

	/**
	 * @param {Site} newSite 
	 * @returns {PlutusCorePair}
	 */
	copy(newSite) {
		return new PlutusCorePair(newSite, this.#first, this.#second);
	}

	toString() {
		return `(${this.#first.toString()}, ${this.#second.toString()})`;
	}

	/**
	 * @returns {boolean}
	 */
	isPair() {
		return true;
	}

	get first() {
		return this.#first;
	}

	get second() {
		return this.#second;
	}

	typeBits() {
		// 7 (7 (6) (fst)) (snd)
		return `011101110110${this.#first.typeBits()}${this.#second.typeBits()}`;
	}

	/**
	 * @param {BitWriter} bitWriter
	 */
	toFlatValueInternal(bitWriter) {
		this.#first.toFlatValueInternal(bitWriter);
		this.#second.toFlatValueInternal(bitWriter);
	}
}

/**
 * UPLC pair value class that only contains data
 * Only used during evaluation.
 */
class PlutusCoreMapItem extends PlutusCoreValue {
	#key;
	#value;

	/**
	 * @param {Site} site 
	 * @param {PlutusCoreData} key 
	 * @param {PlutusCoreData} value 
	 */
	constructor(site, key, value) {
		super(site);
		this.#key = key;
		this.#value = value;
	}

	get memSize() {
		return 1 + (new PlutusCoreDataValue(this.site, this.#key)).memSize + 
			(new PlutusCoreDataValue(this.site, this.#value)).memSize;
	}

	/**
	 * @param {Site} newSite 
	 * @returns {PlutusCoreMapItem}
	 */
	copy(newSite) {
		return new PlutusCoreMapItem(newSite, this.#key, this.#value);
	}

	toString() {
		return `(${this.#key.toString()}: ${this.#value.toString()})`;
	}

	/**
	 * @returns {boolean}
	 */
	isMapItem() {
		return true;
	}

	get key() {
		return this.#key;
	}

	get value() {
		return this.#value;
	}

	typeBits() {
		// 7 (7 (6) (8)) (8)
		return "01110111011010001000";
	}

	/**
	 * @param {BitWriter} bitWriter
	 */
	toFlatValueInternal(bitWriter) {
		this.#key.toFlatValue(bitWriter);
		this.#value.toFlatValue(bitWriter);
	}
}

/** 
 * UPLC list value class.
 * Only used during evaluation.
*/
class PlutusCoreList extends PlutusCoreValue {
	#items;

	/**
	 * @param {Site} site 
	 * @param {PlutusCoreData[]} items 
	 */
	constructor(site, items) {
		super(site);
		this.#items = items;
	}

	get memSize() {
		let sum = 0;

		for (let item of this.#items) {
			let data = new PlutusCoreDataValue(this.site, item);

			sum += data.memSize;
		}

		return sum;
	}

	/**
	 * @param {Site} newSite
	 * @returns {PlutusCoreList}
	 */
	copy(newSite) {
		return new PlutusCoreList(newSite, this.#items.slice());
	}

	/**
	 * @returns {boolean}
	 */
	isList() {
		return true;
	}

	get list() {
		return this.#items.slice();
	}

	toString() {
		return `[${this.#items.map(item => item.toString()).join(", ")}]`;
	}

	typeBits() {
		// 7 (5) (8)
		return `011101011000`;
	}

	/**
	 * @param {BitWriter} bitWriter 
	 */
	toFlatValueInternal(bitWriter) {
		for (let item of this.#items) {
			bitWriter.write('1');
			item.toFlatValue(bitWriter);
		}

		bitWriter.write('0');
	}
}

/**
 * UPLC map value class.
 * Only used during evaluation.
 */
class PlutusCoreMap extends PlutusCoreValue {
	#pairs;

	/**
	 * @param {Site} site 
	 * @param {PlutusCoreMapItem[]} pairs 
	 */
	constructor(site, pairs) {
		super(site);
		this.#pairs = pairs;
	}

	get memSize() {
		let sum = 0;

		for (let pair of this.#pairs) {

			sum += pair.memSize;
		}

		return sum;
	}

	/**
	 * @param {Site} newSite 
	 * @returns {PlutusCoreMap}
	 */
	copy(newSite) {
		return new PlutusCoreMap(newSite, this.#pairs.slice());
	}

	/**
	 * @returns {boolean}
	 */
	isMap() {
		return true;
	}

	get map() {
		return this.#pairs.slice();
	}

	toString() {
		return `{${this.#pairs.map((pair) => `${pair.key.toString()}: ${pair.value.toString()}`).join(", ")}}`;
	}

	typeBits() {
		// 7 (5) (7 (7 (6) (8)) (8))
		return `0111010101110111011010001000`;
	}

	/**
	 * @param {BitWriter} bitWriter 
	 */
	toFlatValueInternal(bitWriter) {

		for (let pair of this.#pairs) {
			bitWriter.write('1');

			pair.toFlatValueInternal(bitWriter);
		}

		bitWriter.write('0');
	}
}

/**
 * Wrapper for PlutusCoreData.
 */
class PlutusCoreDataValue extends PlutusCoreValue {
	#data;

	/**
	 * @param {Site} site 
	 * @param {PlutusCoreData} data 
	 */
	constructor(site, data) {
		super(site);
		this.#data = assertDefined(data);
		assert(data instanceof PlutusCoreData);
	}

	get memSize() {
		return this.#data.memSize;
	}

	/**
	 * @param {Site} newSite 
	 * @returns {PlutusCoreDataValue}
	 */
	copy(newSite) {
		return new PlutusCoreDataValue(newSite, this.#data);
	}

	isData() {
		return true;
	}

	get data() {
		return this.#data;
	}

	toString() {
		return `data(${this.#data.toString()})`;
	}

	typeBits() {
		return '1000';
	}

	/**
	 * @param {BitWriter} bitWriter
	 */
	toFlatValueInternal(bitWriter) {
		this.#data.toFlatValue(bitWriter);
	}
}

/**
 * Base class of UPLC terms
 */
class PlutusCoreTerm {
	#site;
	#type;

	/**
	 * @param {Site} site
	 * @param {number} type
	 */
	constructor(site, type) {
		assert(site != undefined && site instanceof Site);
		this.#site = site;
		this.#type = type;
	}

	get site() {
		return this.#site;
	}

	/**
	 * Generic term toString method
	 * @returns {string}
	 */
	toString() {
		return `(Term ${this.#type.toString()})`;
	}

	/**
	 * Calculates a value, and also increments the cost
	 * @param {PlutusCoreRTE | PlutusCoreStack} rte 
	 * @returns {Promise<PlutusCoreValue>}
	 */
	async eval(rte) {
		throw new Error("not yet implemented");
	}

	/**
	 * Writes bits of flat encoded UPLC terms to bitWriter. Doesn't return anything.
	 * @param {BitWriter} bitWriter 
	 */
	toFlat(bitWriter) {
		throw new Error("not yet implemented");
	}
}

/**
 * UPLC variable ref term (index is a Debruijn index)
 */
class PlutusCoreVariable extends PlutusCoreTerm {
	#index;

	/**
	 * @param {Site} site 
	 * @param {PlutusCoreInt} index 
	 */
	constructor(site, index) {
		super(site, 0);
		this.#index = index;
	}

	toString() {
		return `x${this.#index.toString()}`;
	}

	/**
	 * @param {BitWriter} bitWriter 
	 */
	toFlat(bitWriter) {
		bitWriter.write('0000');
		this.#index.toFlatUnsigned(bitWriter);
	}

	/**
	 * @param {PlutusCoreRTE | PlutusCoreStack} rte
	 * @returns {Promise<PlutusCoreValue>}
	 */
	async eval(rte) {
		// add costs before get the value
		rte.incrVariableCost();

		return rte.get(Number(this.#index.int));
	}
}

/**
 * UPLC delay term.
 */
class PlutusCoreDelay extends PlutusCoreTerm {
	#expr;

	/**
	 * @param {Site} site 
	 * @param {PlutusCoreTerm} expr 
	 */
	constructor(site, expr) {
		super(site, 1);
		this.#expr = expr;
	}

	toString() {
		return `(delay ${this.#expr.toString()})`;
	}

	/**
	 * @param {BitWriter} bitWriter 
	 */
	toFlat(bitWriter) {
		bitWriter.write('0001');
		this.#expr.toFlat(bitWriter);
	}

	/**
	 * @param {PlutusCoreRTE | PlutusCoreStack} rte 
	 * @returns {Promise<PlutusCoreValue>}
	 */
	async eval(rte) {
		rte.incrDelayCost();

		return await this.#expr.eval(rte);
	}
}

/**
 * UPLC lambda term
 */
class PlutusCoreLambda extends PlutusCoreTerm {
	#rhs;
	#argName;

	/**
	 * @param {Site} site
	 * @param {PlutusCoreTerm} rhs
	 * @param {?string} argName
	 */
	constructor(site, rhs, argName = null) {
		super(site, 2);
		this.#rhs = rhs;
		this.#argName = argName;
	}

	/**
	 * Returns string with unicode lambda symbol
	 * @returns {string}
	 */
	toString() {
		return `(\u039b${this.#argName !== null ? " " + this.#argName + " ->" : ""} ${this.#rhs.toString()})`;
	}

	/**
	 * @param {BitWriter} bitWriter 
	 */
	toFlat(bitWriter) {
		bitWriter.write('0010');
		this.#rhs.toFlat(bitWriter);
	}

	/**
	 * @param {PlutusCoreRTE | PlutusCoreStack} rte 
	 * @returns {Promise<PlutusCoreValue>}
	 */
	async eval(rte) {
		rte.incrLambdaCost();

		return new PlutusCoreAnon(this.site, rte, this.#argName !== null ? [this.#argName] : 1, (callSite, subStack) => {
			return this.#rhs.eval(subStack);
		});
	}
}

/**
 * UPLC function application term (i.e. function call)
 */
class PlutusCoreCall extends PlutusCoreTerm {
	#a;
	#b;

	/**
	 * @param {Site} site
	 * @param {PlutusCoreTerm} a
	 * @param {PlutusCoreTerm} b
	 */
	constructor(site, a, b) {
		super(site, 3);
		this.#a = a;
		this.#b = b;
	}

	toString() {
		return `[${this.#a.toString()} ${this.#b.toString()}]`;
	}

	/**
	 * @param {BitWriter} bitWriter 
	 */
	toFlat(bitWriter) {
		bitWriter.write('0011');
		this.#a.toFlat(bitWriter);
		this.#b.toFlat(bitWriter);
	}

	/**
	 * @param {PlutusCoreRTE | PlutusCoreStack} rte 
	 * @returns 
	 */
	async eval(rte) {
		rte.incrCallCost();

		let fn = await this.#a.eval(rte);
		let arg = await this.#b.eval(rte);

		return await fn.call(rte, this.site, arg);
	}
}

/**
 * UPLC const term (i.e. a literal in conventional sense)
 */
class PlutusCoreConst extends PlutusCoreTerm {
	#value;

	/**
	 * @param {PlutusCoreValue} value 
	 */
	constructor(value) {
		super(value.site, 4);
		this.#value = value;
	}

	get value() {
		return this.#value;
	}

	/**
	 * @returns {string}
	 */
	toString() {
		return this.#value.toString();
	}

	/**
	 * @param {BitWriter} bitWriter 
	 */
	toFlat(bitWriter) {
		bitWriter.write('0100');
		this.#value.toFlatValue(bitWriter);
	}

	/**
	 * @param {PlutusCoreStack | PlutusCoreRTE} rte 
	 * @returns {Promise<PlutusCoreValue>}
	 */
	async eval(rte) {
		rte.incrConstCost();

		return await this.#value.eval(rte);
	}
}

/**
 * UPLC force term
 */
class PlutusCoreForce extends PlutusCoreTerm {
	#expr;

	/**
	 * @param {Site} site
	 * @param {PlutusCoreTerm} expr
	 */
	constructor(site, expr) {
		super(site, 5);
		this.#expr = expr;
	}

	toString() {
		return `(force ${this.#expr.toString()})`;
	}

	/**
	 * @param {BitWriter} bitWriter 
	 */
	toFlat(bitWriter) {
		bitWriter.write('0101');
		this.#expr.toFlat(bitWriter);
	}

	/**
	 * @param {PlutusCoreRTE | PlutusCoreStack} rte 
	 * @returns {Promise<PlutusCoreValue>}
	 */
	async eval(rte) {
		rte.incrForceCost();

		return await this.#expr.eval(rte);
	}
}

/**
 * UPLC error term
 */
class PlutusCoreError extends PlutusCoreTerm {
	/** 'msg' is only used for debuggin and doesn't actually appear in the final program */
	#msg;

	/**
	 * @param {Site} site 
	 * @param {string} msg 
	 */
	constructor(site, msg = "") {
		super(site, 6);
		this.#msg = msg;
	}

	toString() {
		return "(error)";
	}

	/**
	 * @param {BitWriter} bitWriter 
	 */
	toFlat(bitWriter) {
		bitWriter.write('0110');
	}

	/**
	 * Throws a RuntimeError when evaluated.
	 * @param {PlutusCoreRTE | PlutusCoreStack} rte 
	 * @returns {Promise<PlutusCoreValue>}
	 */
	async eval(rte) {
		throw this.site.runtimeError(this.#msg);
	}
}

/**
 * UPLC builtin function ref term
 */
class PlutusCoreBuiltin extends PlutusCoreTerm {
	/** unknown builtins stay integers */
	#name;

	/**
	 * @param {Site} site 
	 * @param {string | number} name 
	 */
	constructor(site, name) {
		super(site, 7);
		this.#name = name;
	}

	toString() {
		if (typeof this.#name == "string") {
			return `(builtin ${this.#name})`;
		} else {
			return `(builtin unknown${this.#name.toString()})`;
		}
	}

	/**
	 * @param {BitWriter} bitWriter 
	 */
	toFlat(bitWriter) {
		bitWriter.write('0111');

		/** @type {number} */
		let i;

		if (typeof this.#name == "string") {
			i = PLUTUS_CORE_BUILTINS.findIndex(info => info.name == this.#name);
		} else {
			i = this.#name;
		}

		let bitString = padZeroes(i.toString(2), 7);

		bitWriter.write(bitString);
	}

	/**
	 * @param {NetworkParams} params
	 * @param  {...PlutusCoreValue} args
	 * @returns {Cost}
	 */
	calcCost(params, ...args) {
		let i = PLUTUS_CORE_BUILTINS.findIndex(info => info.name == this.#name);

		return PLUTUS_CORE_BUILTINS[i].calcCost(params, args.map(a => a.memSize));
	}

	/**
	 * Used by IRCoreCallExpr
	 * @param {Word} name
	 * @param {PlutusCoreValue[]} args
	 * @returns {PlutusCoreValue}
	 */
	static evalStatic(name, args) {
		let builtin = new PlutusCoreBuiltin(name.site, name.value);

		let dummyRte = new PlutusCoreRTE();

		let anon = builtin.evalInternal(dummyRte);

		let subStack = new PlutusCoreStack(dummyRte);

		let res = anon.callSync(name.site, subStack, args);

		if (res instanceof Promise) {
			throw new Error("can't call trace through evalStatic");
		} else {
			return res;
		}
	}

	/**
	 * @param {PlutusCoreRTE | PlutusCoreStack} rte
	 * @returns {PlutusCoreAnon}
	 */
	evalInternal(rte = new PlutusCoreRTE()) {
		if (typeof this.#name == "number") {
			throw new Error("can't evaluate unknow uplc builtin");
		}

		switch (this.#name) {
			case "addInteger":
				// returning a lambda is assumed to be free
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					// but calling a lambda has a cost associated
					rte.calcAndIncrCost(this, a, b);

					return new PlutusCoreInt(callSite, a.int + b.int);
				});
			case "subtractInteger":
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					rte.calcAndIncrCost(this, a, b);

					return new PlutusCoreInt(callSite, a.int - b.int);
				});
			case "multiplyInteger":
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					rte.calcAndIncrCost(this, a, b);

					return new PlutusCoreInt(callSite, a.int * b.int);
				});
			case "divideInteger":
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					rte.calcAndIncrCost(this, a, b);

					if (b.int === 0n) {
						throw callSite.runtimeError("division by zero");
					} else {
						return new PlutusCoreInt(callSite, a.int / b.int);
					}
				});
			case "modInteger":
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					rte.calcAndIncrCost(this, a, b);

					if (b.int === 0n) {
						throw callSite.runtimeError("division by zero");
					} else {
						return new PlutusCoreInt(callSite, a.int % b.int);
					}
				});
			case "equalsInteger":
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					rte.calcAndIncrCost(this, a, b);

					return new PlutusCoreBool(callSite, a.int == b.int);
				});
			case "lessThanInteger":
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					rte.calcAndIncrCost(this, a, b);

					return new PlutusCoreBool(callSite, a.int < b.int);
				});
			case "lessThanEqualsInteger":
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					rte.calcAndIncrCost(this, a, b);

					return new PlutusCoreBool(callSite, a.int <= b.int);
				});
			case "appendByteString":
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					rte.calcAndIncrCost(this, a, b);

					return new PlutusCoreByteArray(callSite, a.bytes.concat(b.bytes));
				});
			case "consByteString":
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					rte.calcAndIncrCost(this, a, b);

					let bytes = b.bytes;
					bytes.unshift(Number(a.int % 256n));
					return new PlutusCoreByteArray(callSite, bytes);
				});
			case "sliceByteString":
				return new PlutusCoreAnon(this.site, rte, 3, (callSite, _, a, b, c) => {
					rte.calcAndIncrCost(this, a, b, c);

					let start = Number(a.int);
					let n = Number(b.int);
					let bytes = c.bytes;
					if (start < 0) {
						start = 0;
					}

					if (start + n > bytes.length) {
						n = bytes.length - start;
					}

					if (n < 0) {
						n = 0;
					}

					let sub = bytes.slice(start, start + n);

					return new PlutusCoreByteArray(callSite, sub);
				});
			case "lengthOfByteString":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					return new PlutusCoreInt(callSite, BigInt(a.bytes.length));
				});
			case "indexByteString":
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					rte.calcAndIncrCost(this, a, b);

					let bytes = a.bytes;
					let i = b.int;
					if (i < 0 || i >= bytes.length) {
						throw new Error("index out of range");
					}

					return new PlutusCoreInt(callSite, BigInt(bytes[Number(i)]));
				});
			case "equalsByteString":
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					rte.calcAndIncrCost(this, a, b);

					let aBytes = a.bytes;
					let bBytes = b.bytes;

					let res = true;
					if (aBytes.length != bBytes.length) {
						res = false;
					} else {
						for (let i = 0; i < aBytes.length; i++) {
							if (aBytes[i] != bBytes[i]) {
								res = false;
								break;
							}
						}
					}

					return new PlutusCoreBool(callSite, res);
				});
			case "lessThanByteString":
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					rte.calcAndIncrCost(this, a, b);

					let aBytes = a.bytes;
					let bBytes = b.bytes;

					let res = true;
					if (aBytes.length == 0) {
						res = bBytes.length != 0;
					} else if (bBytes.length == 0) {
						res = false;
					} else {
						for (let i = 0; i < Math.min(aBytes.length, bBytes.length); i++) {
							if (aBytes[i] >= bBytes[i]) {
								res = false;
								break;
							}
						}
					}

					return new PlutusCoreBool(callSite, res);
				});
			case "lessThanEqualsByteString":
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					rte.calcAndIncrCost(this, a, b);

					let aBytes = a.bytes;
					let bBytes = b.bytes;

					let res = true;
					if (aBytes.length == 0) {
						res = true;
					} else if (bBytes.length == 0) {
						res = false;
					} else {
						for (let i = 0; i < Math.min(aBytes.length, bBytes.length); i++) {
							if (aBytes[i] > bBytes[i]) {
								res = false;
								break;
							}
						}
					}

					return new PlutusCoreBool(callSite, res);
				});
			case "appendString":
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					rte.calcAndIncrCost(this, a, b);

					return new PlutusCoreString(callSite, a.string + b.string);
				});
			case "equalsString":
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					rte.calcAndIncrCost(this, a, b);

					return new PlutusCoreBool(callSite, a.string == b.string);
				});
			case "encodeUtf8":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					return new PlutusCoreByteArray(callSite, stringToBytes(a.string));
				});
			case "decodeUtf8":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					try {
						return new PlutusCoreString(callSite, bytesToString(a.bytes));
					} catch(_) {
						throw callSite.runtimeError("invalid utf-8");
					}
				});
			case "sha2_256":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					return new PlutusCoreByteArray(callSite, Crypto.sha2_256(a.bytes))
				});
			case "sha3_256":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					return new PlutusCoreByteArray(callSite, Crypto.sha3(a.bytes))
				});
			case "blake2b_256":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					return new PlutusCoreByteArray(callSite, Crypto.blake2b(a.bytes))
				});
			case "verifyEd25519Signature":
				return new PlutusCoreAnon(this.site, rte, 3, (callSite, _, key, msg, signature) => {
					rte.calcAndIncrCost(this, key, msg, signature);

					let keyBytes = key.bytes;
					if (keyBytes.length != 32) {
						throw callSite.runtimeError(`expected key of length 32 for verifyEd25519Signature, got key of length ${keyBytes.length}`);
					}

					let msgBytes = msg.bytes;
					
					let signatureBytes = signature.bytes;
					if (signatureBytes.length != 64) {
						throw callSite.runtimeError(`expected signature of length 64 for verifyEd25519Signature, got signature of length ${signatureBytes.length}`);
					}

					let ok = Crypto.Ed25519.verify(signatureBytes, msgBytes, keyBytes);

					return new PlutusCoreBool(callSite, ok);
				});
			case "ifThenElse":
				return new PlutusCoreAnon(this.site, rte, 3, (callSite, _, a, b, c) => {
					rte.calcAndIncrCost(this, a, b, c);
					return a.bool ? b.copy(callSite) : c.copy(callSite);
				});
			case "chooseUnit":
				// what is the point of this function?
				throw new Error("no immediate need, so don't bother yet");
			case "trace":
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					rte.calcAndIncrCost(this, a, b);

					return rte.print(a.string).then(() => {
						return b.copy(callSite);
					});
				});
			case "fstPair":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					if (a.isPair()) {
						return a.first.copy(callSite);
					} else if (a.isMapItem()) {
						return new PlutusCoreDataValue(callSite, a.key);
					} else {
						throw callSite.typeError(`expected pair or data-pair for first arg, got '${a.toString()}'`);
					}
				});
			case "sndPair":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					if (a.isPair()) {
						return a.second.copy(callSite);
					} else if (a.isMapItem()) {
						return new PlutusCoreDataValue(callSite, a.value);
					} else {
						throw callSite.typeError(`expected pair or data-pair for first arg, got '${a.toString()}'`);
					}
				});
			case "chooseList":
				throw new Error("no immediate need, so don't bother yet");
			case "mkCons":
				// only allow data items in list
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					rte.calcAndIncrCost(this, a, b);

					if (b.isList()) {
						if (!a.isData()) {
							throw callSite.typeError(`expected data, got ${a.toString()}`);
						}

						let item = a.data;
						let lst = b.list;
						lst.unshift(item);
						return new PlutusCoreList(callSite, lst);
					} else if (b.isMap()) {
						let pairs = b.map;
						pairs.unshift(new PlutusCoreMapItem(callSite, a.key, a.value));
						return new PlutusCoreMap(callSite, pairs);
					} else {
						throw callSite.typeError(`expected list or map for second arg, got '${b.toString()}'`);
					}
				});
			case "headList":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					if (a.isList()) {
						let lst = a.list;
						if (lst.length == 0) {
							throw callSite.runtimeError("empty list");
						}

						return new PlutusCoreDataValue(callSite, lst[0]);
					} else if (a.isMap()) {
						let lst = a.map;
						if (lst.length == 0) {
							throw callSite.runtimeError("empty map");
						}

						return lst[0].copy(callSite);
					} else {
						throw callSite.typeError(`expected list or map, got '${a.toString()}'`);
					}
				});
			case "tailList":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					if (a.isList()) {
						let lst = a.list;
						if (lst.length == 0) {
							throw callSite.runtimeError("empty list");
						}

						return new PlutusCoreList(callSite, lst.slice(1));
					} else if (a.isMap()) {
						let lst = a.map;
						if (lst.length == 0) {
							throw callSite.runtimeError("empty map");
						}

						return new PlutusCoreMap(callSite, lst.slice(1));
					} else {
						throw callSite.typeError(`expected list or map, got '${a.toString()}'`);
					}
				});
			case "nullList":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					if (a.isList()) {
						return new PlutusCoreBool(callSite, a.list.length == 0);
					} else if (a.isMap()) {
						return new PlutusCoreBool(callSite, a.map.length == 0);
					} else {
						throw callSite.typeError(`expected list or map, got '${a.toString()}'`);
					}
				});
			case "chooseData":
				throw new Error("no immediate need, so don't bother yet");
			case "constrData":
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					rte.calcAndIncrCost(this, a, b);

					let i = a.int;
					assert(i >= 0);
					let lst = b.list;
					return new PlutusCoreDataValue(callSite, new ConstrData(Number(i), lst));
				});
			case "mapData":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					return new PlutusCoreDataValue(callSite, new MapData(a.map.map(pair => {
						return [pair.key, pair.value];
					})));
				});
			case "listData":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					return new PlutusCoreDataValue(callSite, new ListData(a.list));
				});
			case "iData":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);
					
					return new PlutusCoreDataValue(callSite, new IntData(a.int));
				});
			case "bData":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					return new PlutusCoreDataValue(callSite, new ByteArrayData(a.bytes));
				});
			case "unConstrData":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					if (!a.isData()) {
						throw callSite.typeError(`expected data, got ${a.toString()}`);
					}

					let data = a.data;
					if (!(data instanceof ConstrData)) {
						throw callSite.runtimeError(`unexpected unConstrData argument '${data.toString()}'`);
					} else {
						return new PlutusCorePair(callSite, new PlutusCoreInt(callSite, BigInt(data.index)), new PlutusCoreList(callSite, data.fields));
					}
				});
			case "unMapData":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					if (!a.isData()) {
						throw callSite.typeError(`expected data, got ${a.toString()}`);
					}

					let data = a.data;
					if (!(data instanceof MapData)) {
						throw callSite.runtimeError(`unexpected unMapData argument '${data.toString()}'`);
					} else {
						return new PlutusCoreMap(callSite, data.map.map(([fst, snd]) => new PlutusCoreMapItem(callSite, fst, snd)));
					}
				});
			case "unListData":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					if (!a.isData()) {
						throw callSite.typeError(`expected data, got ${a.toString()}`);
					}

					let data = a.data;
					if (!(data instanceof ListData)) {
						throw callSite.runtimeError(`unexpected unListData argument '${data.toString()}'`);
					} else {
						return new PlutusCoreList(callSite, data.list);
					}
				});
			case "unIData":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					if (!a.isData()) {
						throw callSite.typeError(`expected data, got ${a.toString()}`);
					}

					let data = a.data;
					if (!(data instanceof IntData)) {
						throw callSite.runtimeError(`unexpected unIData argument '${data.toString()}'`);
					} else {
						return new PlutusCoreInt(callSite, data.value);
					}
				});
			case "unBData":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					if (!a.isData()) {
						throw callSite.typeError(`expected data, got ${a.toString()}`);
					}

					let data = a.data;
					if (!(data instanceof ByteArrayData)) {
						throw callSite.runtimeError(`unexpected unBData argument '${data.toString()}'`);
					} else {
						return new PlutusCoreByteArray(callSite, data.bytes);
					}
				});
			case "equalsData":
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					rte.calcAndIncrCost(this, a, b);

					if (!a.isData()) {
						throw callSite.typeError(`expected data, got ${a.toString()}`);
					}

					if (!b.isData()) {
						throw callSite.typeError(`expected data, got ${b.toString()}`);
					}

					// just compare the schema jsons for now
					return new PlutusCoreBool(callSite, a.data.isSame(b.data));
				});
			case "mkPairData":
				return new PlutusCoreAnon(this.site, rte, 2, (callSite, _, a, b) => {
					rte.calcAndIncrCost(this, a, b);

					return new PlutusCoreMapItem(callSite, a.data, b.data);
				});
			case "mkNilData":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					a.assertUnit();

					return new PlutusCoreList(callSite, []);
				});
			case "mkNilPairData":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					a.assertUnit();

					return new PlutusCoreMap(callSite, []);
				});
			case "serialiseData":
				return new PlutusCoreAnon(this.site, rte, 1, (callSite, _, a) => {
					rte.calcAndIncrCost(this, a);

					return new PlutusCoreByteArray(callSite, a.data.toCBOR());
				});
			case "verifyEcdsaSecp256k1Signature":
			case "verifySchnorrSecp256k1Signature":
				throw new Error("no immediate need, so don't bother yet");
			default:
				throw new Error(`builtin ${this.#name} not yet implemented`);
		}
	}

	/**
	 * Returns appropriate callback wrapped with PlutusCoreAnon depending on builtin name.
	 * Emulates every Plutus-Core that Helios exposes to the user.
	 * @param {PlutusCoreRTE | PlutusCoreStack} rte 
	 * @returns {Promise<PlutusCoreValue>}
	 */
	async eval(rte) {
		rte.incrBuiltinCost();

		return this.evalInternal(rte);
	}
}

/**
 * UPLC program class
 */
class PlutusCoreProgram {
	#version;
	#expr;

	/**
	 * @param {PlutusCoreTerm} expr 
	 * @param {PlutusCoreInt[]} version 
	 */
	constructor(expr, version = PLUTUS_CORE_VERSION_COMPONENTS.map(v => new PlutusCoreInt(expr.site, v, false))) {
		this.#version = version;
		this.#expr = expr;
	}

	get site() {
		return new Site(this.#expr.site.src, 0);
	}

	// returns the IR source
	get src() {
		return this.site.src.raw;
	}

	get versionString() {
		return this.#version.map(v => v.toString()).join(".");
	}

	/**
	 * @returns {string}
	 */
	plutusScriptVersion() {
		// Note: only supports PlutusScriptV2 for now
		return PLUTUS_SCRIPT_VERSION;
	}

	toString() {
		return `(program ${this.versionString} ${this.#expr.toString()})`;
	}

	/**
	 * Flat encodes the entire UPLC program.
	 * Note that final padding isn't added now but is handled by bitWriter upon finalization.
	 * @param {BitWriter} bitWriter 
	 */
	toFlat(bitWriter) {
		for (let v of this.#version) {
			v.toFlatUnsigned(bitWriter);
		}

		this.#expr.toFlat(bitWriter);
	}

	/**
	 * @param {PlutusCoreRTE} rte 
	 * @returns {Promise<PlutusCoreValue>}
	 */
	async eval(rte) {
		return this.#expr.eval(rte);
	}

	/**
	 * Evaluates the term contained in PlutusCoreProgram (assuming it is a lambda term)
	 * @param {?PlutusCoreValue[]} args
	 * @param {PlutusCoreRTECallbacks} callbacks
	 * @param {?NetworkParams} networkParams
	 * @returns {Promise<PlutusCoreValue>}
	 */
	async runInternal(args, callbacks = DEFAULT_PLUTUS_CORE_RTE_CALLBACKS, networkParams = null) {
		assertDefined(callbacks);

		let rte = new PlutusCoreRTE(callbacks, networkParams);

		// add the startup costs
		rte.incrStartupCost();

		let fn = await this.eval(rte);

		// program site is at pos 0, but now the call site is actually at the end 
		let globalCallSite = new Site(this.site.src, this.site.src.length);
		
		/** @type {PlutusCoreValue} */
		let result = fn;

		if (args !== null) {
			for (let arg of args) {
				// each call also adds to the total cost
				rte.incrCallCost();
				rte.incrConstCost();

				result = await result.call(rte, globalCallSite, arg);
			}
		}

		return result;
	}

	/**
	 * @param {?PlutusCoreValue[]} args - if null the top-level term is returned as a value
	 * @param {PlutusCoreRTECallbacks} callbacks 
	 * @param {?NetworkParams} networkParams
	 * @returns {Promise<PlutusCoreValue | UserError>}
	 */
	async run(args, callbacks = DEFAULT_PLUTUS_CORE_RTE_CALLBACKS, networkParams = null) {
		let globalCallSite = new Site(this.site.src, this.site.src.length);

		if (args !== null && args.length == 0) {
			args = [new PlutusCoreUnit(globalCallSite)];
		}

		try {
			return await this.runInternal(args, callbacks, networkParams);
		} catch (e) {
			if (!(e instanceof UserError)) {
				throw e;
			} else {
				return e;
			}
		}
	}

	/**
	 * @param {?PlutusCoreValue[]} args
	 * @returns {Promise<[(PlutusCoreValue | UserError), string[]]>}
	 */
	async runWithPrint(args) {
		/**
		 * @type {string[]}
		 */
		let messages = [];

		let callbacks = Object.assign({}, DEFAULT_PLUTUS_CORE_RTE_CALLBACKS);

		callbacks.onPrint = async function(msg) {
			messages.push(msg);
		};

		let res = await this.run(args, callbacks);

		return [res, messages];
	}

	/**
	 * @typedef {Object} Profile
	 * @property {bigint} mem  - in 8 byte words (i.e. 1 mem unit is 64 bits)
	 * @property {bigint} cpu  - in reference cpu microseconds
	 * @property {number} size - in bytes
	 */

	/**
	 * @param {PlutusCoreValue[]} args
	 * @param {NetworkParams} networkParams
	 * @returns {Promise<Profile>}
	 */
	async profile(args, networkParams) {
		let callbacks = Object.assign({}, DEFAULT_PLUTUS_CORE_RTE_CALLBACKS);

		let memCost = 0n;
		let cpuCost = 0n;

		/**
		 * @type {(cost: Cost) => void}
		 */
		callbacks.onIncrCost = (cost) => {
			memCost += cost.mem;
			cpuCost += cost.cpu;
		};

		let res = await this.run(args, callbacks, networkParams);
		
		return {
			mem: memCost,
			cpu: cpuCost,
			size: this.calcSize(),
		};
	}

	/**
	 * Returns flat bytes of serialized script
	 * @returns {number[]}
	 */
	serializeBytes() {
		let bitWriter = new BitWriter();

		this.toFlat(bitWriter);

		return bitWriter.finalize();
	}

	/**
	 * Calculates the on chain size of the program (number of bytes).
	 * @returns {number}
	 */
	calcSize() {
		return this.serializeBytes().length;
	}

	/**
	 * Returns plutus-core script in JSON format (as string, not as object!)
	 * @returns {string}
	 */
	serialize() {
		let bytes = this.serializeBytes();

		let cborHex = bytesToHex(wrapCBORBytes(wrapCBORBytes(bytes)));

		return `{"type": "${this.plutusScriptVersion()}", "description": "", "cborHex": "${cborHex}"}`;
	}

	/**
	 * @returns {number[]} - 28 byte hash
	 */
	hash() {
		let innerBytes = wrapCBORBytes(this.serializeBytes());

		let v = this.plutusScriptVersion();
		switch (v) {
			case "PlutusScriptV1":
				innerBytes.unshift(1);
				break;
			case "PlutusScriptV2":
				innerBytes.unshift(2);
				break;
			default:
				throw new Error(`unhandled script version '${v}'`);
		}

		// used for both script addresses and minting policy hashes
		return Crypto.blake2b(innerBytes, 28);
	}
}


/////////////////////////////////
// Section 5: Plutus data objects
/////////////////////////////////

/**
 * @typedef {(bytes: number[]) => void} Decoder
 */

/**
 * @typedef {(i: number, bytes: number[]) => void} IDecoder
 */

/**
 * Base case of any CBOR serializable data class
 * Also contains helper methods for (de)serializing data to/from CBOR
 */
export class CBORData {
	constructor() {
	}

	/**
	 * @returns {number[]}
	 */
	toCBOR() {
		throw new Error("not yet implemented");
	}

	/**
	 * @param {number} m - major type
	 * @param {bigint} n - size parameter
	 * @returns {number[]} - uint8 bytes
	 */
	static encodeHead(m, n) {
		if (n <= 23n) {
			return [32*m + Number(n)];
		} else if (n >= 24n && n <= 255n) {
			return [32*m + 24, Number(n)];
		} else if (n >= 256n && n <= 256n*256n - 1n) {
			return [32*m + 25, Number((n/256n)%256n), Number(n%256n)];
		} else if (n >= 256n*256n && n <= 256n*256n*256n*256n - 1n) {
			let e4 = bigIntToBytes(n);

			while (e4.length < 4) {
				e4.unshift(0);
			}
			return [32*m + 26].concat(e4);
		} else if (n >= 256n*256n*256n*256n && n <= 256n*256n*256n*256n*256n*256n*256n*256n - 1n) {
			let e8 = bigIntToBytes(n);

			while(e8.length < 8) {
				e8.unshift(0);
			}
			return [32*m + 27].concat(e8);
		} else {
			throw new Error("n out of range");
		}
	}

	/**
	 * @param {number[]} bytes - mutated to contain the rest
	 * @returns {[number, bigint]} - [majorType, n]
	 */
	static decodeHead(bytes) {
		if (bytes.length == 0) {
			throw new Error("empty cbor head");
		}

		let first = assertDefined(bytes.shift());

		if (first%32 <= 23) {
			return [idiv(first, 32), BigInt(first%32)];
		} else if (first%32 == 24) {
			return [idiv(first, 32), bytesToBigInt(bytes.splice(0, 1))];
		} else if (first%32 == 25) {
			return [idiv(first, 32), bytesToBigInt(bytes.splice(0, 2))];
		} else if (first%32 == 26) {
			return [idiv(first, 32), bytesToBigInt(bytes.splice(0, 4))];
		} else if (first%32 == 27) {
			return [idiv(first, 32), bytesToBigInt(bytes.splice(0, 8))];
		} else {
			throw new Error("bad header");
		}
	}

	/**
	 * @param {number} m 
	 * @returns {number[]}
	 */
	static encodeIndefHead(m) {
		return [32*m + 31];
	}

	/**
	 * @param {number[]} bytes - cbor bytes
	 * @returns {number} - majorType
	 */
	static decodeIndefHead(bytes) {
		let first = assertDefined(bytes.shift());

		let m = idiv(first - 31, 32);
		
		return m;
	}

	/**
	 * @param {number[]} bytes
	 * @returns {boolean}
	 */
	static isNull(bytes) {
		return bytes[0] == 246;
	}

	/**
	 * @returns {number[]}
	 */
	static encodeNull() {
		return [246];
	}

	/**
	 * Throws error if not null
	 * @param {number[]} bytes 
	 */
	static decodeNull(bytes) {
		let b = assertDefined(bytes.shift());

		if (b != 246) {
			throw new Error("not null");
		}
	}

	/**
	 * @param {boolean} b
	 * @returns {number[]}
	 */
	static encodeBool(b) {
		if (b) {
			return [245];
		} else {
			return [244];
		}
	}

	/**
	 * @param {number[]} bytes 
	 * @returns {boolean}
	 */
	static decodeBool(bytes) {
		let b = assertDefined(bytes.shift());

		if (b == 245) {
			return true;
		} else if (b == 244) {
			return false;
		} else {
			throw new Error("unexpected non-boolean cbor object");
		}
	}

	/**
	 * @param {number[]} bytes 
	 * @returns {boolean} 
	 */
	static isDefBytes(bytes) {
		if (bytes.length == 0) {
			throw new Error("empty cbor bytes");
		}

		let [m, _] = CBORData.decodeHead(bytes.slice(0, 9));

		return m == 2;
	}

	/**
	 * @param {number[]} bytes
	 * @returns {boolean}
	 */
	static isIndefBytes(bytes) {
		if (bytes.length == 0) {
			throw new Error("empty cbor bytes");
		}

		return 2*32 + 31 == bytes[0];
	}

	/**
	 * @param {number[]} bytes 
	 * @param {boolean} splitInChunks
	 * @returns {number[]} - cbor bytes
	 */
	static encodeBytes(bytes, splitInChunks = true) {
		bytes = bytes.slice();

		if (bytes.length <= 64 || !splitInChunks) {
			let head = CBORData.encodeHead(2, BigInt(bytes.length));
			return head.concat(bytes);
		} else {
			let res = CBORData.encodeIndefHead(2);

			while (bytes.length > 0) {
				let chunk = bytes.splice(0, 64);

				res = res.concat(CBORData.encodeHead(2, BigInt(chunk.length))).concat(chunk);
			}

			res.push(255);

			return res;
		}
	}

	/**
	 * Decodes both an indef array of bytes, and a bytearray of specified length
	 * @param {number[]} bytes - cborbytes, mutated to form remaining
	 * @returns {number[]} - byteArray
	 */
	static decodeBytes(bytes) {
		// check header type
		assert(bytes.length > 0);

		if (CBORData.isIndefBytes(bytes)) {
			// multiple chunks
			void bytes.shift();

			/**
			 * @type {number[]}
			 */
			let res = [];

			while(bytes[0] != 255) {
				let [_, n] = CBORData.decodeHead(bytes);
				if (n > 64n) {
					throw new Error("bytearray chunk too large");
				}

				res = res.concat(bytes.splice(0, Number(n)));
			}

			assert(bytes.shift() == 255);

			return res;
		} else {
			let [_, n] = CBORData.decodeHead(bytes);

			return bytes.splice(0, Number(n));
		}
	}

	/**
	 * @param {bigint} n
	 * @returns {number[]} - cbor bytes
	 */
	static encodeInteger(n) {
		if (n >= 0n && n <= (2n << 63n) - 1n) {
			return CBORData.encodeHead(0, n);
		} else if (n >= (2n << 63n)) {
			return CBORData.encodeHead(6, 2n).concat(CBORData.encodeBytes(bigIntToBytes(n), false));
		} else if (n <= -1n && n >= -(2n << 63n)) {
			return CBORData.encodeHead(1, -n - 1n);
		} else {
			return CBORData.encodeHead(6, 3n).concat(CBORData.encodeBytes(bigIntToBytes(-n - 1n), false));
		}
	}

	/**
	 * @param {number[]} bytes
	 * @returns {bigint}
	 */
	static decodeInteger(bytes) {
		let [m, n] = CBORData.decodeHead(bytes);

		if (m == 0) {
			return n;
		} else if (m == 1) {
			return -n - 1n;
		} else if (m == 6) {
			if (n == 2n) {
				let b = CBORData.decodeBytes(bytes);

				return bytesToBigInt(b);
			} else if (n == 3n) {
				let b = CBORData.decodeBytes(bytes);

				return -bytesToBigInt(b) - 1n;
			} else {
				throw new Error(`unexpected tag n:${n}`);
			}
		} else {
			throw new Error(`unexpected tag m:${m}`);
		}
	}

	/**
	 * @param {number[]} bytes
	 * @returns {boolean}
	 */
	static isIndefList(bytes) {
		if (bytes.length == 0) {
			throw new Error("empty cbor bytes");
		}

		return 4*32 + 31 == bytes[0];
	}

	/**
	 * @returns {number[]}
	 */
	static encodeIndefListStart() {
		return CBORData.encodeIndefHead(4);
	}

	/**
	 * @param {CBORData[] | number[][]} list 
	 * @returns {number[]}
	 */
	static encodeListInternal(list) {
		/**
		 * @type {number[]}
		 */
		let res = [];
		for (let item of list) {
			if (item instanceof CBORData) {
				res = res.concat(item.toCBOR());
			} else {
				res = res.concat(item);
			}
		}

		return res;
	}

	/**
	 * @returns {number[]}
	 */
	static encodeIndefListEnd() {
		return [255];
	}

	/**
	 * @param {CBORData[] | number[][]} list 
	 * @returns {number[]}
	 */
	static encodeIndefList(list) {
		return CBORData.encodeIndefListStart().concat(CBORData.encodeListInternal(list)).concat(CBORData.encodeIndefListEnd());
	}

	/**
	 * @param {number[]} bytes 
	 * @returns {boolean}
	 */
	static isDefList(bytes) {
		let [m, _] = CBORData.decodeHead(bytes.slice(0, 9));

		return m == 4;
	}

	/**
	 * @param {bigint} n
	 * @returns {number[]}
	 */
	static encodeDefListStart(n) {
		return CBORData.encodeHead(4, n);
	}

	/**
	 * @param {CBORData[] | number[][]} list 
	 * @returns {number[]}
	 */
	static encodeDefList(list) {
		return CBORData.encodeDefListStart(BigInt(list.length)).concat(CBORData.encodeListInternal(list));
	}

	/**
	 * @param {number[]} bytes
	 * @param {Decoder} itemDecoder
	 */
	 static decodeList(bytes, itemDecoder) {
		if (CBORData.isIndefList(bytes)) {
			assert(CBORData.decodeIndefHead(bytes) == 4);

			while(bytes[0] != 255) {
				itemDecoder(bytes);
			}
	
			assert(bytes.shift() == 255);
		} else {
			let [m, n] = CBORData.decodeHead(bytes);

			assert(m == 4);

			for (let i = 0; i < Number(n); i++) {
				itemDecoder(bytes);
			}
		}
	}

	/**
	 * @param {number[]} bytes
	 * @returns {boolean}
	 */
	static isTuple(bytes) {
		return CBORData.isIndefList(bytes) || CBORData.isDefList(bytes);
	}

	/**
	 * @param {number[][]} tuple
	 * @returns {number[]}
	 */
	static encodeTuple(tuple) {
		return CBORData.encodeDefList(tuple);
	}


	/**
	 * @param {number[]} bytes 
	 * @param {IDecoder} tupleDecoder 
	 * @returns {number} - returns the size of the tuple
	 */
	static decodeTuple(bytes, tupleDecoder) {
		let count = 0;

		CBORData.decodeList(bytes, (itemBytes) => {
			tupleDecoder(count, itemBytes);
			count++;
		});

		return count;
	}

	/**
	 * @param {number[]} bytes 
	 * @returns {boolean}
	 */
	static isDefMap(bytes) {
		let [m, _] = CBORData.decodeHead(bytes.slice(0, 9));

		return m == 5;
	}

	/**
	 * @param {[CBORData | number[], CBORData | number[]][]} pairList
	 * @returns {number[]}
	 */
	static encodeMapInternal(pairList) {
		/**
		 * @type {number[]}
		 */
		let res = [];

		for (let pair of pairList) {
			let key = pair[0];
			let value = pair[1];

			if (key instanceof CBORData) {
				res = res.concat(key.toCBOR());
			} else {
				res = res.concat(key);
			}

			if (value instanceof CBORData) {
				res = res.concat(value.toCBOR());
			} else {
				res = res.concat(value);
			}
		}

		return res;
	}

	/**
	 * A decode map method doesn't exist because it specific for the requested type
	 * @param {[CBORData | number[], CBORData | number[]][]} pairList 
	 * @returns {number[]}
	 */
	static encodeMap(pairList) {
		return CBORData.encodeHead(5, BigInt(pairList.length)).concat(CBORData.encodeMapInternal(pairList));
	}

	/**
	 * @param {number[]} bytes
	 * @param {Decoder} pairDecoder
	 */
	static decodeMap(bytes, pairDecoder) {
		let [m, n] = CBORData.decodeHead(bytes);

		assert(m == 5);

		for (let i = 0; i < n; i++) {
			pairDecoder(bytes);
		}
	}

	/**
	 * @param {number[]} bytes
	 * @returns {boolean}
	 */
	static isObject(bytes) {
		return CBORData.isDefMap(bytes);
	}

	/**
	 * @param {Map<number, CBORData | number[]>} object
	 * @returns {number[]}
	 */
	static encodeObject(object) {
		return CBORData.encodeMap(Array.from(object.entries()).map(pair => [
			CBORData.encodeInteger(BigInt(pair[0])),
			pair[1]
		]));
	}

	/**
	 * @param {number[]} bytes
	 * @param {IDecoder} fieldDecoder
	 * @returns {Set<number>}
	 */
	static decodeObject(bytes, fieldDecoder) {
		/** @type {Set<number>} */
		let done = new Set();

		CBORData.decodeMap(bytes, pairBytes => {
			let i = Number(CBORData.decodeInteger(pairBytes));

			fieldDecoder(i, pairBytes);
			done.add(i);
		});

		return done;
	}

	/**
	 * @param {number[]} bytes
	 * @returns {boolean}
	 */
	static isConstr(bytes) {
		if (bytes.length == 0) {
			throw new Error("empty cbor bytes");
		}

		let [m, _] = CBORData.decodeHead(bytes.slice(0, 9));

		return m == 6;
	}

	/**
	 * Encode a constructor tag of a ConstrData type
	 * @param {number} tag 
	 * @returns {number[]}
	 */
	static encodeConstrTag(tag) {
		if (tag >= 0 && tag <= 6) {
			return CBORData.encodeHead(6, 121n + BigInt(tag));
		} else if (tag >= 7 && tag <= 127) {
			return CBORData.encodeHead(6, 1280n + BigInt(tag - 7));
		} else {
			return CBORData.encodeHead(6, 102n).concat(CBORData.encodeHead(4, 2n)).concat(CBORData.encodeInteger(BigInt(tag)));
		}
	}

	/**
	 * @param {number} tag 
	 * @param {CBORData[] | number[][]} fields 
	 * @returns {number[]}
	 */
	static encodeConstr(tag, fields) {
		return CBORData.encodeConstrTag(tag).concat(CBORData.encodeIndefList(fields));
	}

	/**
	 * @param {number[]} bytes
	 * @returns {number}
	 */
	static decodeConstrTag(bytes) {
		// constr
		let [m, n] = CBORData.decodeHead(bytes);

		assert(m == 6);

		if (n < 127n) {
			return Number(n - 121n);
		} else if (n == 102n) {
			let [mCheck, nCheck] = CBORData.decodeHead(bytes);
			assert(mCheck == 4 && nCheck == 2n);

			return Number(CBORData.decodeInteger(bytes));
		} else {
			return Number(n - 1280n + 7n);
		}
	}

	/**
	 * Returns the tag
	 * @param {number[]} bytes 
	 * @param {Decoder} fieldDecoder 
	 * @returns {number}
	 */
	static decodeConstr(bytes, fieldDecoder) {
		let tag = CBORData.decodeConstrTag(bytes);

		CBORData.decodeList(bytes, fieldDecoder);

		return tag;
	}
}

/**
 * Base class for UPLC data classes (not the same as UPLC value classes!)
 */
class PlutusCoreData extends CBORData {
	constructor() {
		super();
	}

	/**
	 * Estimate of memory usage during validation
	 * @type {number}
	 */
	get memSize() {
		throw new Error("not yet implemented");
	}

	/**
	 * @param {PlutusCoreData} other 
	 * @returns {boolean}
	 */
	isSame(other) {
		return this.toSchemaJSON() == other.toSchemaJSON();
	}

	/**
	 * @type {number}
	 */
	get constrIndex() {
		throw new Error("not a constr");
	}

	/**
	 * @returns {string}
	 */
	toString() {
		throw new Error("not yet implemented");
	}

	/**
	 * @returns {IR}
	 */
	toIR() {
		throw new Error("not yet implemented");
	}

	/**
	 * @returns {string}
	 */
	toSchemaJSON() {
		throw new Error("not yet implemented");
	}

	/**
	 * @param {BitWriter} bitWriter
	 */
	toFlatValue(bitWriter) {
		throw new Error("not yet implemented");
	}

	/**
	 * @param {number[]} bytes 
	 * @returns {PlutusCoreData}
	 */
	static fromCBOR(bytes) {
		if (CBORData.isIndefList(bytes)) {	
			return ListData.fromCBOR(bytes);		
		} else if (CBORData.isIndefBytes(bytes)) {
			return ByteArrayData.fromCBOR(bytes);
		} else {
			if (CBORData.isDefBytes(bytes)) {
				return ByteArrayData.fromCBOR(bytes);
			} else if (CBORData.isDefMap(bytes)) {
				return MapData.fromCBOR(bytes);
			} else if (CBORData.isConstr(bytes)) {
				return ConstrData.fromCBOR(bytes);
			} else {
				// int, must come last
				return IntData.fromCBOR(bytes);
			}
		}
	}
}

/**
 * UPLC int data class
 */
export class IntData extends PlutusCoreData {
	#value;

	/**
	 * @param {bigint} value 
	 */
	constructor(value) {
		super();
		this.#value = value;
	}

	get value() {
		return this.#value;
	}

	get memSize() {
		return PLUTUS_CORE_DATA_NODE_MEM_SIZE + (new PlutusCoreInt(Site.dummy(), this.#value)).memSize;
	}

	/**
	 * @returns {string}
	 */
	toString() {
		return this.#value.toString();
	}

	/**
	 * Returns integer literal wrapped with integer data function call.
	 * @returns {IR}
	 */
	toIR() {
		return new IR(`__core__iData(${this.#value.toString()})`);
	}

	/**
	 * Returns string, not js object, because of unbounded integers 
	 * @returns {string}
	 */
	toSchemaJSON() {
		return `{"int": ${this.#value.toString()}}`;
	}

	/**
	 * @returns {number[]}
	 */
	toCBOR() {
		return CBORData.encodeInteger(this.#value);
	}

	/**
	 * @param {number[]} bytes
	 * @returns {IntData}
	 */
	static fromCBOR(bytes) {
		return new IntData(CBORData.decodeInteger(bytes));
	}

	/**
	 * @param {BitWriter} bitWriter 
	 */
	toFlatValue(bitWriter) {
		bitWriter.writeByte(3);

		this.toCBOR().forEach(b => {
			bitWriter.writeByte(b);
		});
	}
}

/**
 * UPLC bytearray data class.
 * Wraps a regular list of uint8 numbers (so not Uint8Array)
 */
export class ByteArrayData extends PlutusCoreData {
	#bytes;

	/**
	 * @param {number[]} bytes 
	 */
	constructor(bytes) {
		super();
		this.#bytes = bytes;
	}

	/**
	 * Applies utf-8 encoding
	 * @param {string} s 
	 * @returns {ByteArrayData}
	 */
	static fromString(s) {
		let bytes = stringToBytes(s);

		return new ByteArrayData(bytes);
	}

	get bytes() {
		return this.#bytes.slice();
	}

	get memSize() {
		return PLUTUS_CORE_DATA_NODE_MEM_SIZE + (new PlutusCoreByteArray(Site.dummy(), this.#bytes)).memSize;
	}

	/**
	 * @returns {string}
	 */
	toHex() {
		return bytesToHex(this.#bytes);
	}

	toString() {
		return `#${this.toHex()}`;
	}

	/**
	 * Returns bytearray literal wrapped with bytearray data function as IR.
	 * @returns {IR}
	 */
	toIR() {
		return new IR(`__core__bData(#${this.toHex()})`);
	}

	/**
	 * @returns {string}
	 */
	toSchemaJSON() {
		return `{"bytes": "${this.toHex()}"}`;
	}

	/**
	 * @returns {number[]}
	 */
	toCBOR() {
		return CBORData.encodeBytes(this.#bytes);
	}

	/**
	 * @param {number[]} bytes 
	 * @returns {ByteArrayData}
	 */
	static fromCBOR(bytes) {
		return new ByteArrayData(CBORData.decodeBytes(bytes));
	}

	/**
	 * @param {BitWriter} bitWriter
	 */
	toFlatValue(bitWriter) {
		bitWriter.writeByte(4);

		this.toCBOR().forEach(b => {
			bitWriter.writeByte(b);
		})
	}
}

/**
 * UPLC list data class
 */
export class ListData extends PlutusCoreData {
	#items;

	/**
	 * @param {PlutusCoreData[]} items 
	 */
	constructor(items) {
		super();
		this.#items = items;
	}

	get list() {
		return this.#items.slice();
	}

	get memSize() {
		let sum = PLUTUS_CORE_DATA_NODE_MEM_SIZE;

		for (let item of this.#items) {
			sum += item.memSize;
		}

		return sum;
	}

	toString() {
		return `[${this.#items.map(item => item.toString()).join(", ")}]`;
	}

	/**
	 * @returns {IR}
	 */
	toIR() {
		let ir = new IR("__core__mkNilData(())");
		for (let i = this.#items.length - 1; i >= 0; i--) {
			ir = new IR([new IR("__core__mkCons("), this.#items[i].toIR(), new IR(", "), ir, new IR(")")]);
		}

		return new IR([new IR("__core__listData("), ir, new IR(")")]);
	}

	/**
	 * @returns {string}
	 */
	toSchemaJSON() {
		return `{"list":[${this.#items.map(item => item.toSchemaJSON()).join(", ")}]}`;
	}

	/**
	 * @returns {number[]}
	 */
	toCBOR() {
		return CBORData.encodeIndefList(this.#items);
	}

	/**
	 * @param {number[]} bytes 
	 * @returns {ListData}
	 */
	static fromCBOR(bytes) {
		/**
		 * @type {PlutusCoreData[]}
		 */
		let list = [];

		CBORData.decodeList(bytes, (itemBytes) => {
			list.push(PlutusCoreData.fromCBOR(itemBytes));
		});

		return new ListData(list);
	}

	/**
	 * @param {BitWriter} bitWriter
	 */
	toFlatValue(bitWriter) {
		bitWriter.writeByte(2);

		this.toCBOR().forEach(b => {
			bitWriter.writeByte(b);
		});
	}
}

/**
 * UPLC map data class
 */
export class MapData extends PlutusCoreData {
	#pairs;

	/**
	 * @param {[PlutusCoreData, PlutusCoreData][]} pairs 
	 */
	constructor(pairs) {
		super();
		this.#pairs = pairs;
	}

	get map() {
		return this.#pairs.slice();
	}

	get memSize() {
		let sum = PLUTUS_CORE_DATA_NODE_MEM_SIZE;

		for (let [k, v] of this.#pairs) {
			sum += k.memSize + v.memSize;
		}

		return sum;
	}

	toString() {
		return `{${this.#pairs.map(([fst, snd]) => `${fst.toString()}: ${snd.toString()}`).join(", ")}}`;
	}

	/**
	 * @returns {IR}
	 */
	toIR() {
		let ir = new IR("__core__mkNilPairData(())");

		for (let i = this.#pairs.length - 1; i >= 0; i--) {
			let a = this.#pairs[i][0].toIR();
			let b = this.#pairs[i][1].toIR();

			ir = new IR([new IR("__core__mkCons(__core__mkPairData("), a, new IR(", "), b, new IR(", "), new IR(")"), new IR(", "), ir, new IR(")")]);
		}

		return new IR([new IR("__core__mapData("), ir, new IR(")")]);
	}

	/**
	 * @returns {string}
	 */
	toSchemaJSON() {
		return `{"map": [${this.#pairs.map(pair => { return "{\"k\": " + pair[0].toSchemaJSON() + ", \"v\": " + pair[1].toSchemaJSON() + "}" }).join(", ")}]}`;
	}

	/**
	 * @returns {number[]}
	 */
	toCBOR() {
		return CBORData.encodeMap(this.#pairs);
	}

	/**
	 * @param {number[]} bytes 
	 * @returns {MapData}
	 */
	static fromCBOR(bytes) {
		/**
		 * @type {[PlutusCoreData, PlutusCoreData][]}
		 */
		let pairs = [];

		CBORData.decodeMap(bytes, pairBytes => {
			pairs.push([PlutusCoreData.fromCBOR(pairBytes), PlutusCoreData.fromCBOR(pairBytes)]);
		});

		return new MapData(pairs);
	}

	/**
	 * @param {BitWriter} bitWriter
	 */
	toFlatValue(bitWriter) {
		bitWriter.writeByte(1);

		this.toCBOR().forEach(b => {
			bitWriter.writeByte(b);
		});
	}
}

/**
 * UPLC constructed data class
 */
export class ConstrData extends PlutusCoreData {
	#index;
	#fields;

	/**
	 * @param {number} index 
	 * @param {PlutusCoreData[]} fields 
	 */
	constructor(index, fields) {
		super();
		this.#index = index;
		this.#fields = fields;
	}

	get index() {
		return this.#index;
	}

	get fields() {
		return this.#fields.slice();
	}

	get memSize() {
		let sum = PLUTUS_CORE_DATA_NODE_MEM_SIZE;

		for (let field of this.#fields) {
			sum += field.memSize;
		}

		return sum;
	}

	/**
	 * @returns {string}
	 */
	toString() {
		let parts = this.#fields.map(field => field.toString());
		return `${this.#index.toString()}{${parts.join(", ")}}`;
	}

	/**
	 * @returns {IR}
	 */
	toIR() {
		let ir = new IR("__core__mkNilData(())");
		for (let i = this.#fields.length - 1; i >= 0; i--) {
			ir = new IR([new IR("__core__mkCons("), this.#fields[i].toIR(), new IR(", "), ir, new IR(")")]);
		}

		return new IR([new IR("__core__constrData("), new IR(this.#index.toString()), new IR(", "), ir, new IR(")")]);
	}

	/**
	 * @returns {string}
	 */
	toSchemaJSON() {
		return `{"constructor": ${this.#index.toString()}, "fields": [${this.#fields.map(f => f.toSchemaJSON()).join(", ")}]}`;
	}

	/**
	 * @returns {number[]}
	 */
	toCBOR() {
		return CBORData.encodeConstr(this.#index, this.#fields);
	}

	/**
	 * @param {number[]} bytes 
	 * @returns {ConstrData}
	 */
	static fromCBOR(bytes) {
		/**
		 * @type {PlutusCoreData[]}
		 */
		let fields = [];

		let tag = CBORData.decodeConstr(bytes, (fieldBytes) => {
			fields.push(PlutusCoreData.fromCBOR(fieldBytes));
		});

		return new ConstrData(tag, fields);
	}

	/**
	 * @param {BitWriter} bitWriter
	 */
	toFlatValue(bitWriter) {
		bitWriter.writeByte(0);

		this.toCBOR().forEach(b => {
			bitWriter.writeByte(b);
		});
	}
}


///////////////////////////
// Section 6: Token objects
///////////////////////////

/**
 * Token is the base class of all Expressions and Statements
 */
class Token {
	#site;

	/**
	 * @param {Site} site 
	 */
	constructor(site) {
		this.#site = assertDefined(site); // position in source of start of token
	}

	get site() {
		return this.#site;
	}

	/**
	 * @returns {string}
	 */
	toString() {
		throw new Error("not yet implemented");
	}

	/**
	 * Returns 'true' if 'this' is a literal primitive, a literal struct constructor, or a literal function expression.
	 * @returns {boolean}
	 */
	isLiteral() {
		return false;
	}

	/**
	 * Returns 'true' if 'this' is a Word token.
	 * @param {?(string | string[])} value
	 * @returns {boolean}
	 */
	isWord(value = null) {
		return false;
	}

	/**
	 * Returns 'true' if 'this' is a Symbol token (eg. '+', '(' etc.)
	 * @param {?(string | string[])} value
	 * @returns {boolean}
	 */
	isSymbol(value = null) {
		return false;
	}

	/**
	 * Returns 'true' if 'this' is a group (eg. '(...)').
	 * @param {?string} value
	 * @returns {boolean}
	 */
	isGroup(value) {
		return false;
	}

	/**
	 * Returns a SyntaxError at the current Site.
	 * @param {string} msg 
	 * @returns {UserError}
	 */
	syntaxError(msg) {
		return this.#site.syntaxError(msg);
	}

	/**
	 * Returns a TypeError at the current Site.
	 * @param {string} msg
	 * @returns {UserError}
	 */
	typeError(msg) {
		return this.#site.typeError(msg);
	}

	/**
	 * Returns a ReferenceError at the current Site.
	 * @param {string} msg
	 * @returns {UserError}
	 */
	referenceError(msg) {
		return this.#site.referenceError(msg);
	}

	/**
	 * Throws a SyntaxError if 'this' isn't a Word.
	 * @param {?(string | string[])} value 
	 * @returns {Word}
	 */
	assertWord(value = null) {
		if (value !== null) {
			throw this.syntaxError(`expected \'${value}\', got \'${this.toString()}\'`);
		} else {
			throw this.syntaxError(`expected word, got ${this.toString()}`);
		}
	}

	/**
	 * Throws a SyntaxError if 'this' isn't a Symbol.
	 * @param {?(string | string[])} value 
	 * @returns {Symbol}
	 */
	assertSymbol(value = null) {
		if (value !== null) {
			throw this.syntaxError(`expected '${value}', got '${this.toString()}'`);
		} else {
			throw this.syntaxError(`expected symbol, got '${this.toString()}'`);
		}
	}

	/**
	 * Throws a SyntaxError if 'this' isn't a Group.
	 * @param {?string} type 
	 * @param {?number} nFields
	 * @returns {Group}
	 */
	assertGroup(type = null, nFields = null) {
		if (type !== null) {
			throw this.syntaxError(`invalid syntax: expected '${type}...${Group.matchSymbol(type)}'`)
		} else {
			throw this.syntaxError(`invalid syntax: expected group`);
		}
	}
}

/**
 * A Word token represents a token that matches /[A-Za-z_][A-Za-z_0-9]/
 */
class Word extends Token {
	#value;

	/**
	 * @param {Site} site 
	 * @param {string} value 
	 */
	constructor(site, value) {
		super(site);
		this.#value = value;
	}

	/**
	 * @param {string} value 
	 * @returns {Word}
	 */
	static new(value) {
		return new Word(Site.dummy(), value);
	}

	get value() {
		return this.#value;
	}

	/**
	 * @param {?(string | string[])} value 
	 * @returns {boolean}
	 */
	isWord(value = null) {
		if (value !== null) {
			if (value instanceof Array) {
				return value.lastIndexOf(this.#value) != -1;
			} else {
				return value == this.#value;
			}
		} else {
			return true;
		}
	}

	/**
	 * @param {?(string | string[])} value 
	 * @returns {Word}
	 */
	assertWord(value = null) {
		if (!this.isWord(value)) {
			super.assertWord(value);
		}

		return this;
	}

	/**
	 * @returns {Word}
	 */
	assertNotInternal() {
		if (this.#value == "_") {
			throw this.syntaxError("_ is reserved");
		} else if (this.#value.startsWith("__")) {
			throw this.syntaxError("__ prefix is reserved");
		} else if (this.#value.endsWith("__")) {
			throw this.syntaxError("__ suffix is reserved");
		}

		return this;
	}

	/**
	 * @returns {boolean}
	 */
	isKeyword() {
		switch (this.#value) {
			case "const":
			case "func":
			case "struct":
			case "enum":
			case "if":
			case "else":
			case "switch":
			case "print":
			case "self":
				return true;
			default:
				return false;
		}
	}

	/**
	 * @returns {Word}
	 */
	assertNotKeyword() {
		this.assertNotInternal();

		if (this.isKeyword()) {
			throw this.syntaxError(`'${this.#value}' is a reserved word`);
		}

		return this;
	}

	/**
	 * @returns {string}
	 */
	toString() {
		return this.#value;
	}

	/**
	 * Finds the index of the first Word(value) in a list of tokens
	 * Returns -1 if none found
	 * @param {Token[]} ts 
	 * @param {string | string[]} value 
	 * @returns {number}
	 */
	static find(ts, value) {
		return ts.findIndex(item => item.isWord(value));
	}
}

/**
 * Symbol token represent anything non alphanumeric
 */
class Symbol extends Token {
	#value;

	/**
	 * @param {Site} site
	 * @param {string} value
	 */
	constructor(site, value) {
		super(site);
		this.#value = value;
	}

	get value() {
		return this.#value;
	}

	/**
	 * @param {?(string | string[])} value 
	 * @returns {boolean}
	 */
	isSymbol(value = null) {
		if (value !== null) {
			if (value instanceof Array) {
				return value.lastIndexOf(this.#value) != -1;
			} else {
				return value == this.#value;
			}
		} else {
			return true;
		}
	}

	/**
	 * @param {?(string | string[])} value 
	 * @returns {Symbol}
	 */
	assertSymbol(value) {
		if (!this.isSymbol(value)) {
			super.assertSymbol(value);
		}

		return this;
	}

	/**
	 * @returns {string}
	 */
	toString() {
		return this.#value;
	}

	/**
	 * Finds the index of the first Symbol(value) in a list of tokens.
	 * Returns -1 if none found.
	 * @param {Token[]} ts
	 * @param {string | string[]} value
	 * @returns {number}
	 */
	static find(ts, value) {
		return ts.findIndex(item => item.isSymbol(value));
	}

	/**
	 * Finds the index of the last Symbol(value) in a list of tokens.
	 * Returns -1 if none found.
	 * @param {Token[]} ts 
	 * @param {string | string[]} value 
	 * @returns {number}
	 */
	static findLast(ts, value) {
		for (let i = ts.length - 1; i >= 0; i--) {
			if (ts[i].isSymbol(value)) {
				return i;
			}
		}

		return -1;
	}
}

/**
 * Group token can '(...)', '[...]' or '{...}' and can contain comma separated fields.
 */
class Group extends Token {
	#type;
	#fields;
	#firstComma;

	/**
	 * @param {Site} site 
	 * @param {string} type - "(", "[" or "{"
	 * @param {Token[][]} fields 
	 * @param {?Symbol} firstComma
	 */
	constructor(site, type, fields, firstComma = null) {
		super(site);
		this.#type = type;
		this.#fields = fields; // list of lists of tokens
		this.#firstComma = firstComma;

		assert(fields.length < 2 || firstComma !== null);
	}

	get fields() {
		return this.#fields.slice(); // copy, so fields_ doesn't get mutated
	}

	/**
	 * @param {?string} type 
	 * @returns {boolean}
	 */
	isGroup(type = null) {
		if (type !== null) {
			return this.#type == type;
		} else {
			return true;
		}
	}

	/**
	 * @param {?string} type 
	 * @param {?number} nFields 
	 * @returns {Group}
	 */
	assertGroup(type = null, nFields = null) {
		if (type !== null && this.#type != type) {
			throw this.syntaxError(`invalid syntax: expected '${type}...${Group.matchSymbol(type)}', got '${this.#type}...${Group.matchSymbol(this.#type)}'`);
		} else if (type !== null && nFields !== null && nFields != this.#fields.length) {
			if (this.#fields.length > 1 && nFields <= 1 && this.#firstComma !== null) {
				throw this.#firstComma.syntaxError(`invalid syntax, unexpected ','`);
			} else {
				throw this.syntaxError(`invalid syntax: expected '${type}...${Group.matchSymbol(type)}' with ${nFields} field(s), got '${type}...${Group.matchSymbol(type)}' with ${this.#fields.length} fields`);
			}
		}

		return this;
	}

	/**
	 * @returns {string}
	 */
	toString() {
		let s = this.#type;

		let parts = [];
		for (let f of this.#fields) {
			parts.push(f.map(t => t.toString()).join(" "));
		}

		s += parts.join(", ") + Group.matchSymbol(this.#type);

		return s;
	}

	/**
	 * @param {Token} t 
	 * @returns {boolean}
	 */
	static isOpenSymbol(t) {
		return t.isSymbol("{") || t.isSymbol("[") || t.isSymbol("(");
	}

	/**
	 * @param {Token} t 
	 * @returns {boolean}
	 */
	static isCloseSymbol(t) {
		return t.isSymbol("}") || t.isSymbol("]") || t.isSymbol(")");
	}

	/**
	 * Returns the corresponding closing bracket, parenthesis or brace.
	 * Throws an error if not a group symbol.
	 * @example
	 * Group.matchSymbol("(") => ")"
	 * @param {string | Symbol} t
	 * @returns {string}
	 */
	static matchSymbol(t) {
		if (t instanceof Symbol) {
			t = t.value;
		}

		if (t == "{") {
			return "}";
		} else if (t == "[") {
			return "]";
		} else if (t == "(") {
			return ")";
		} else if (t == "}") {
			return "{";
		} else if (t == "]") {
			return "[";
		} else if (t == ")") {
			return "(";
		} else {
			throw new Error("not a group symbol");
		}
	}

	/**
	 * Finds the index of first Group(type) in list of tokens
	 * Returns -1 if none found.
	 * @param {Token[]} ts 
	 * @param {string} type 
	 * @returns {number}
	 */
	static find(ts, type) {
		return ts.findIndex(item => item.isGroup(type));
	}
}

/**
 * Base class of literal tokens
 */
class PrimitiveLiteral extends Token {
	/**
	 * @param {Site} site 
	 */
	constructor(site) {
		super(site);
	}

	/**
	 * @returns {boolean}
	 */
	isLiteral() {
		return true;
	}
}

/**
 * Signed int literal token
 */
class IntLiteral extends PrimitiveLiteral {
	#value;

	/**
	 * @param {Site} site 
	 * @param {bigint} value 
	 */
	constructor(site, value) {
		super(site);
		this.#value = value;
	}

	get value() {
		return this.#value;
	}

	/**
	 * @returns {string}
	 */
	toString() {
		return this.#value.toString();
	}
}

/**
 * Bool literal token
 */
class BoolLiteral extends PrimitiveLiteral {
	#value;

	/**
	 * @param {Site} site 
	 * @param {boolean} value 
	 */
	constructor(site, value) {
		super(site);
		this.#value = value;
	}

	get value() {
		return this.#value;
	}

	/**
	 * @returns {string}
	 */
	toString() {
		return this.#value ? "true" : "false";
	}
}

/**
 * ByteArray literal token
 */
class ByteArrayLiteral extends PrimitiveLiteral {
	#bytes;

	/**
	 * @param {Site} site 
	 * @param {number[]} bytes 
	 */
	constructor(site, bytes) {
		super(site);
		this.#bytes = bytes;
	}

	get bytes() {
		return this.#bytes;
	}

	toString() {
		return `#${bytesToHex(this.#bytes)}`;
	}
}

/**
 * String literal token (utf8)
 */
class StringLiteral extends PrimitiveLiteral {
	#value;

	/**
	 * @param {Site} site 
	 * @param {string} value 
	 */
	constructor(site, value) {
		super(site);
		this.#value = value;
	}

	get value() {
		return this.#value;
	}

	toString() {
		return `"${this.#value.toString()}"`;
	}
}


//////////////////////////
// Section 7: Tokenization
//////////////////////////

class Tokenizer {
	#src;
	#pos;

	/**
	 * Tokens are accumulated in '#ts'
	 * @type {Token[]} 
	 */
	#ts;
	#codeMap;
	#codeMapPos;

	/**
	 * @param {Source} src 
	 * @param {?CodeMap} codeMap 
	 */
	constructor(src, codeMap = null) {
		assert(src instanceof Source);

		this.#src = src;
		this.#pos = 0;
		this.#ts = []; // reset to empty to list at start of tokenize()
		this.#codeMap = codeMap; // can be a list of pairs [pos, site in another source]
		this.#codeMapPos = 0; // not used if codeMap === null
	}

	incrPos() {
		this.#pos += 1;
	}

	decrPos() {
		this.#pos -= 1;
		assert(this.#pos >= 0);
	}

	get currentSite() {
		return new Site(this.#src, this.#pos);
	}

	/**
	 * @param {Token} t 
	 */
	pushToken(t) {
		this.#ts.push(t);

		if (this.#codeMap !== null && this.#codeMapPos < this.#codeMap.length) {
			let pair = (this.#codeMap[this.#codeMapPos]);

			if (pair[0] == t.site.pos) {
				t.site.setCodeMapSite(pair[1]);
				this.#codeMapPos += 1;
			}
		}
	}

	/**
	 * Reads a single char from the source and advances #pos by one
	 * @returns {string}
	 */
	readChar() {
		assert(this.#pos >= 0);

		let c;
		if (this.#pos < this.#src.length) {
			c = this.#src.getChar(this.#pos);
		} else {
			c = '\0';
		}

		this.incrPos();

		return c;
	}

	/**
	 * Decreases #pos by one
	 */
	unreadChar() {
		this.decrPos();
	}

	/**
	 * Start reading precisely one token
	 * @param {Site} site 
	 * @param {string} c 
	 */
	readToken(site, c) {
		if (c == '_' || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')) {
			this.readWord(site, c);
		} else if (c == '/') {
			this.readMaybeComment(site);
		} else if (c == '0') {
			this.readSpecialInteger(site);
		} else if (c >= '1' && c <= '9') {
			this.readDecimalInteger(site, c);
		} else if (c == '#') {
			this.readByteArray(site);
		} else if (c == '"') {
			this.readString(site);
		} else if (c == '!' || c == '%' || c == '&' || (c >= '(' && c <= '.') || (c >= ':' && c <= '>') || c == '[' || c == ']' || (c >= '{' && c <= '}')) {
			this.readSymbol(site, c);
		} else if (!(c == ' ' || c == '\n' || c == '\t' || c == '\r')) {
			throw site.syntaxError(`invalid source character '${c}' (utf-8 not yet supported outside string literals)`);
		}
	}

	/**
	 * Tokenize the complete source.
	 * Nests groups before returning a list of tokens
	 * @returns {Token[]}
	 */
	tokenize() {
		// reset #ts
		this.#ts = [];

		let site = this.currentSite;
		let c = this.readChar();

		while (c != '\0') {
			this.readToken(site, c);

			site = this.currentSite;
			c = this.readChar();
		}

		return Tokenizer.nestGroups(this.#ts);
	}

	/** 
	 * Returns a generator
	 * Use gen.next().value to access to the next Token
	 * Doesn't perform any grouping
	 * Used for quickly parsing the ScriptPurpose header of a script
	 * @returns {Generator<Token>}
	 */
	*streamTokens() {
		this.#ts = [];

		let site = this.currentSite;
		let c = this.readChar();

		while (c != '\0') {
			this.readToken(site, c);

			let t = this.#ts.shift();
			while (t != undefined) {
				yield t;
				t = this.#ts.shift();
			}

			site = this.currentSite;
			c = this.readChar();
		}

		assert(this.#ts.length == 0);
	}

	/**
	 * Reads one word token.
	 * Immediately turns "true" or "false" into a BoolLiteral instead of keeping it as Word
	 * @param {Site} site
	 * @param {string} c0 - first character 
	 */
	readWord(site, c0) {
		let chars = [];

		let c = c0;
		while (c != '\0') {
			if (c == '_' || (c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')) {
				chars.push(c);
				c = this.readChar();
			} else {
				this.unreadChar();
				break;
			}
		}

		let value = chars.join('');

		if (value == "true" || value == "false") {
			this.pushToken(new BoolLiteral(site, value == "true"));
		} else {
			this.pushToken(new Word(site, value));
		}
	}

	/**
	 * Reads and discards a comment if current '/' char is followed by '/' or '*'.
	 * Otherwise pushes Symbol('/') onto #ts
	 * @param {Site} site 
	 */
	// comments are discarded
	readMaybeComment(site) {
		let c = this.readChar();

		if (c == '\0') {
			this.pushToken(new Symbol(site, '/'));
		} else if (c == '/') {
			this.readSingleLineComment();
		} else if (c == '*') {
			this.readMultiLineComment(site);
		} else {
			this.pushToken(new Symbol(site, '/'));
			this.unreadChar();
		}
	}

	/**
	 * Reads and discards a single line comment (from '//' to end-of-line)
	 */
	readSingleLineComment() {
		let c = this.readChar();

		while (c != '\n') {
			c = this.readChar();
		}
	}

	/**
	 * Reads and discards a multi-line comment (from '/' '*' to '*' '/')
	 * @param {Site} site 
	 */
	readMultiLineComment(site) {
		let prev = '';
		let c = this.readChar();

		while (true) {
			prev = c;
			c = this.readChar();

			if (c == '/' && prev == '*') {
				break;
			} else if (c == '\0') {
				throw site.syntaxError("unterminated multiline comment");
			}
		}
	}

	/**
	 * REads a literal integer
	 * @param {Site} site 
	 */
	readSpecialInteger(site) {
		let c = this.readChar();

		if (c == '\0') {
			this.pushToken(new IntLiteral(site, 0n));
		} else if (c == 'b') {
			this.readBinaryInteger(site);
		} else if (c == 'o') {
			this.readOctalInteger(site);
		} else if (c == 'x') {
			this.readHexInteger(site);
		} else if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')) {
			throw site.syntaxError(`bad literal integer type 0${c}`);
		} else if (c >= '0' && c <= '9') {
			this.readDecimalInteger(site, c);
		} else {
			this.pushToken(new IntLiteral(site, 0n));
			this.unreadChar();
		}
	}

	/**
	 * @param {Site} site 
	 */
	readBinaryInteger(site) {
		this.readRadixInteger(site, "0b", c => (c == '0' || c == '1'));
	}

	/**
	 * @param {Site} site 
	 */
	readOctalInteger(site) {
		this.readRadixInteger(site, "0o", c => (c >= '0' && c <= '7'));
	}

	/**
	 * @param {Site} site 
	 */
	readHexInteger(site) {
		this.readRadixInteger(site, "0x",
			c => ((c >= '0' && c <= '9') || (c >= 'a' || c <= 'f')));
	}

	/**
	 * @param {Site} site 
	 * @param {string} c0 - first character
	 */
	readDecimalInteger(site, c0) {
		let chars = [];

		let c = c0;
		while (c != '\0') {
			if (c >= '0' && c <= '9') {
				chars.push(c);
			} else if ((c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')) {
				throw site.syntaxError("invalid syntax for decimal integer literal");
			} else {
				this.unreadChar();
				break;
			}

			c = this.readChar();
		}

		this.pushToken(new IntLiteral(site, BigInt(chars.join(''))));
	}

	/**
	 * @param {Site} site 
	 * @param {string} prefix 
	 * @param {(c: string) => boolean} valid - checks if character is valid as part of the radix
	 */
	readRadixInteger(site, prefix, valid) {
		let c = this.readChar();

		let chars = [];

		if (!(valid(c))) {
			throw site.syntaxError(`expected at least one char for ${prefix} integer literal`);
		}

		while (c != '\0') {
			if (valid(c)) {
				chars.push(c);
			} else if ((c >= '0' && c <= '9') || (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')) {
				throw site.syntaxError(`invalid syntax for ${prefix} integer literal`);
			} else {
				this.unreadChar();
				break;
			}

			c = this.readChar();
		}

		this.pushToken(new IntLiteral(site, BigInt(prefix + chars.join(''))));
	}

	/**
	 * Reads literal hexadecimal representation of ByteArray
	 * @param {Site} site 
	 */
	readByteArray(site) {
		let c = this.readChar();

		let chars = [];

		// case doesn't matter
		while ((c >= 'a' && c <= 'f') || (c >= '0' && c <= '9')) {
			chars.push(c);
			c = this.readChar();
		}

		// empty byteArray is allowed (eg. for Ada mintingPolicyHash)

		// last char is the one that made the while loop break, so should be unread
		this.unreadChar();

		let bytes = hexToBytes(chars.join(''));

		this.pushToken(new ByteArrayLiteral(site, bytes));
	}

	/**
	 * Reads literal string delimited by double quotes.
	 * Allows for three escape character: '\\', '\n' and '\t'
	 * @param {Site} site 
	 */
	readString(site) {
		let c = this.readChar();

		let chars = [];

		let escaping = false;
		/** @type {?Site} */
		let escapeSite = null; // for escape syntax errors

		while (!(!escaping && c == '"')) {
			if (c == '\0') {
				throw site.syntaxError("unmatched '\"'");
			}

			if (escaping) {
				if (c == 'n') {
					chars.push('\n');
				} else if (c == 't') {
					chars.push('\t');
				} else if (c == '\\') {
					chars.push('\\');
				} else if (c == '"') {
					chars.push(c);
				} else if (escapeSite !== null) {
					throw escapeSite.syntaxError(`invalid escape sequence ${c}`)
				} else {
					throw new Error("escape site should be non-null");
				}

				escaping = false;
			} else {
				if (c == '\\') {
					escapeSite = this.currentSite;
					escaping = true;
				} else {
					chars.push(c);
				}
			}

			c = this.readChar();
		}

		this.pushToken(new StringLiteral(site, chars.join('')));
	}

	/**
	 * Reads single or double character symbols
	 * @param {Site} site 
	 * @param {string} c0 - first character
	 */
	readSymbol(site, c0) {
		let chars = [c0];

		/** @type {(second: string) => boolean} */
		let parseSecondChar = (second) => {
			let d = this.readChar();

			if (d == second) {
				chars.push(d);
				return true;
			} else {
				this.unreadChar();
				return false;
			}
		}

		if (c0 == '|') {
			parseSecondChar('|');
		} else if (c0 == '&') {
			parseSecondChar('&');
		} else if (c0 == '=') {
			if (!parseSecondChar('=')) {
				parseSecondChar('>');
			}
		} else if (c0 == '!' || c0 == '<' || c0 == '>') { // could be !=, ==, <= or >=
			parseSecondChar('=');
		} else if (c0 == ':') {
			parseSecondChar(':');
		} else if (c0 == '-') {
			parseSecondChar('>');
		}

		this.pushToken(new Symbol(site, chars.join('')));
	}

	/**
	 * Separates tokens in fields (separted by commas)
	 * @param {Token[]} ts 
	 * @returns {Group}
	 */
	static buildGroup(ts) {
		let tOpen = ts.shift();
		if (tOpen === undefined) {
			throw new Error("unexpected");
		} else {
			let open = tOpen.assertSymbol();

			let stack = [open]; // stack of symbols
			let curField = [];
			let fields = [];

			/** @type {?Symbol} */
			let firstComma = null;

			/** @type {?Symbol} */
			let lastComma = null;

			while (stack.length > 0 && ts.length > 0) {
				let t = ts.shift();
				let prev = stack.pop();

				if (t != undefined && prev != undefined) {
					if (!t.isSymbol(Group.matchSymbol(prev))) {
						stack.push(prev);

						if (Group.isCloseSymbol(t)) {
							throw t.syntaxError(`unmatched '${t.assertSymbol().value}'`);
						} else if (Group.isOpenSymbol(t)) {
							stack.push(t.assertSymbol());
							curField.push(t);
						} else if (t.isSymbol(",") && stack.length == 1) {
							if (firstComma === null) {
								firstComma = t.assertSymbol();
							}

							lastComma = t.assertSymbol();
							if (curField.length == 0) {
								throw t.syntaxError("empty field");
							} else {
								fields.push(curField);
								curField = [];
							}
						} else {
							curField.push(t);
						}
					} else if (stack.length > 0) {
						curField.push(t);
					}
				} else {
					throw new Error("unexpected");
				}
			}

			let last = stack.pop();
			if (last != undefined) {
				throw last.syntaxError(`EOF while matching '${last.value}'`);
			}

			if (curField.length > 0) {
				// add removing field
				fields.push(curField);
			} else if (lastComma !== null) {
				throw lastComma.syntaxError(`trailing comma`);
			}

			fields = fields.map(f => Tokenizer.nestGroups(f));

			return new Group(tOpen.site, open.value, fields, firstComma);
		}
	}

	/**
	 * Match group open with group close symbols in order to form groups.
	 * This is recursively applied to nested groups.
	 * @param {Token[]} ts 
	 * @returns {Token[]}
	 */
	static nestGroups(ts) {
		let res = [];

		let t = ts.shift();
		while (t != undefined) {
			if (Group.isOpenSymbol(t)) {
				ts.unshift(t);

				res.push(Tokenizer.buildGroup(ts));
			} else if (Group.isCloseSymbol(t)) {
				throw t.syntaxError(`unmatched '${t.assertSymbol().value}'`);
			} else {
				res.push(t);
			}

			t = ts.shift();
		}

		return res;
	}
}

/**
 * Tokenizes a string (wrapped in Source)
 * @param {Source} src 
 * @returns {Token[]}
 */
function tokenize(src) {
	let tokenizer = new Tokenizer(src);

	return tokenizer.tokenize();
}

/**
 * Tokenizes an IR string with a codemap to the original source
 * @param {string} rawSrc 
 * @param {CodeMap} codeMap 
 * @returns {Token[]}
 */
function tokenizeIR(rawSrc, codeMap) {
	let src = new Source(rawSrc);

	// the Tokenizer for Helios can simply be reused for the IR
	let tokenizer = new Tokenizer(src, codeMap);

	return tokenizer.tokenize();
}

/**
 * @param {number} id
 * @returns {string}
 */
 function getPurposeName(id) {
	switch (id) {
		case ScriptPurpose.Testing:
			return "testing";
		case ScriptPurpose.Minting:
			return "minting";
		case ScriptPurpose.Spending:
			return "spending";
		case ScriptPurpose.Staking:
			return "staking";
		default:
			throw new Error(`unhandled ScriptPurpose ${id}`);
	}
}

/**
 * Parses Helios quickly to extract the script purpose header.
 * Returns null if header is missing or incorrectly formed (instead of throwing an error)
 * @param {string} rawSrc 
 * @returns {?[string, string]} - [purpose, name]
 */
export function extractScriptPurposeAndName(rawSrc) {
	try {
		let src = new Source(rawSrc);

		let tokenizer = new Tokenizer(src);

		let gen = tokenizer.streamTokens();

		// Don't parse the whole script, just 'eat' 2 tokens: `<purpose> <name>`
		let ts = [];
		for (let i = 0; i < 2; i++) {
			let yielded = gen.next();
			if (yielded.done) {
				return null;
			}

			ts.push(yielded.value);
		}

		let [purposeId, nameWord] = buildScriptPurpose(ts);

		return [getPurposeName(purposeId), nameWord.value];
	} catch (e) {
		if (!(e instanceof UserError)) {
			throw e;
		} else {
			return null;
		}
	}
}

/**
 * Categories for syntax highlighting
 */
const SyntaxCategory = {
	Normal:     0,
	Comment:    1,
	Literal:    2,
	Symbol:     3,
	Type:       4,
	Keyword:    5,
	Error:      6,
};

/**
 * Applies syntax highlighting by returning a list of char categories.
 * Not part of Tokeizer because it needs to be very fast and can't throw errors.
 * Doesn't depend on any other functions so it can easily be ported to other languages.
 * @param {string} src
 * @returns {Uint8Array}
 */
export function highlight(src) {
	let n = src.length;

	const SyntaxState = {
		Normal:        0,
		SLComment:     1,
		MLComment:     2,
		String:        3,
		NumberStart:   4,
		HexNumber:     5,
		BinaryNumber:  6,
		OctalNumber:   7,
		DecimalNumber: 8,
		ByteArray:     9,
	};

	// array of categories
	let data = new Uint8Array(n);

	let j = 0; // position in data
	let state = SyntaxState.Normal;

	/** @type {Symbol[]} */
	let groupStack = [];
	
	for (let i = 0; i < n; i++) {
		let c = src[i];
		let isLast = i == n - 1;

		switch (state) {
			case SyntaxState.Normal:
				if (c == "/") {
					// maybe comment
					if (!isLast && src[i+1] == "/") {
						data[j++] = SyntaxCategory.Comment;
						data[j++] = SyntaxCategory.Comment;
		
						i++;
						state = SyntaxState.SLComment;
					} else if (!isLast && src[i+1] == "*") {
						data[j++] = SyntaxCategory.Comment;
						data[j++] = SyntaxCategory.Comment;

						i++;
						state = SyntaxState.MLComment;
					} else {
						data[j++] = SyntaxCategory.Symbol;
					}
				} else if (c == "[" || c == "]" || c == "{" || c == "}" || c == "(" || c == ")") {
					let s = new Symbol(new Site(new Source(src), i), c);

					if (Group.isOpenSymbol(s)) {
						groupStack.push(s);
						data[j++] = SyntaxCategory.Normal;
					} else {
						let prevGroup = groupStack.pop();

						if (prevGroup === undefined) {
							data[j++] = SyntaxCategory.Error;
						} else if (c == Group.matchSymbol(prevGroup)) {
							data[j++] = SyntaxCategory.Normal;
						} else {
							data[prevGroup.site.pos] = SyntaxCategory.Error;
							data[j++] = SyntaxCategory.Error;
						}
					}
				} else if (c == "%" || c == "!" || c == "&" || c == "*" || c == "+" || c == "-" || c == "<" || c == "=" || c == ">" || c == "|") {
					// symbol
					switch (c) {
						case "&":
							if (!isLast && src[i+1] == "&") {
								data[j++] = SyntaxCategory.Symbol;
								data[j++] = SyntaxCategory.Symbol;
								i++;
							} else {
								data[j++] = SyntaxCategory.Normal;
							}
							break;
						case "|":
							if (!isLast && src[i+1] == "|") {
								data[j++] = SyntaxCategory.Symbol;
								data[j++] = SyntaxCategory.Symbol;
								i++;
							} else {
								data[j++] = SyntaxCategory.Normal;
							}
							break;
						case "!":
							if (!isLast && src[i+1] == "=") {
								data[j++] = SyntaxCategory.Symbol;
								data[j++] = SyntaxCategory.Symbol;
								i++;
							} else {
								data[j++] = SyntaxCategory.Symbol;
							}
							break;
						case "=":
							if (!isLast && (src[i+1] == "=" || src[i+1] == ">")) {
								data[j++] = SyntaxCategory.Symbol;
								data[j++] = SyntaxCategory.Symbol;
								i++;
							} else {
								data[j++] = SyntaxCategory.Symbol;
							}
							break;
						case ">":
							if (!isLast && src[i+1] == "=") {
								data[j++] = SyntaxCategory.Symbol;
								data[j++] = SyntaxCategory.Symbol;
								i++;
							} else {
								data[j++] = SyntaxCategory.Symbol;
							}
							break;
						case "<":
							if (!isLast && src[i+1] == "=") {
								data[j++] = SyntaxCategory.Symbol;
								data[j++] = SyntaxCategory.Symbol;
								i++;
							} else {
								data[j++] = SyntaxCategory.Symbol;
							}
							break;
						case "-":
							if (!isLast && src[i+1] == ">") {
								data[j++] = SyntaxCategory.Symbol;
								data[j++] = SyntaxCategory.Symbol;
								i++;
							} else {
								data[j++] = SyntaxCategory.Symbol;
							}
							break;
						default:
							data[j++] = SyntaxCategory.Symbol;
					}
				} else if (c == "\"") {
					// literal string
					data[j++] = SyntaxCategory.Literal;
					state = SyntaxState.String;
				} else if (c == "0") {
					// literal number
					data[j++] = SyntaxCategory.Literal;
					state = SyntaxState.NumberStart;
				} else if (c >= "1" && c <= "9") {
					// literal decimal number
					data[j++] = SyntaxCategory.Literal;
					state = SyntaxState.DecimalNumber;
				} else if (c == "#") {
					data[j++] = SyntaxCategory.Literal;
					state = SyntaxState.ByteArray;
				} else if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c == "_") {
					// maybe keyword, builtin type, or boolean
					let i0 = i;
					let chars = [c];
					// move i to the last word char
					while (i + 1 < n) {
						let d = src[i+1];

						if ((d >= "a" && d <= "z") || (d >= "A" && d <= "Z") || d == "_" || (d >= "0" && d <= "9")) {
							chars.push(d);
							i++;
						} else {
							break;
						}
					}

					let word = chars.join("");
					/** @type {number} */
					let type;
					switch (word) {
						case "true":
						case "false":
							type = SyntaxCategory.Literal;
							break;
						case "Bool":
						case "Int":
						case "ByteArray":
						case "String":
						case "Option":
							type = SyntaxCategory.Type;
							break;
						case "if":
						case "else":
						case "switch":
						case "func":
						case "const":
						case "struct":
						case "enum":
						case "print":
						case "self":
							type = SyntaxCategory.Keyword;
							break;
						case "testing":
						case "spending":
						case "minting":
							if (i0 == 0) {
								type = SyntaxCategory.Keyword;
							} else {
								type = SyntaxCategory.Normal;
							}
							break;
						default:
							type = SyntaxCategory.Normal;
					}

					for (let ii = i0; ii < i0 + chars.length; ii++) {
						data[j++] = type;
					}
				} else {
					data[j++] = SyntaxCategory.Normal;
				}
				break;
			case SyntaxState.SLComment:
				data[j++] = SyntaxCategory.Comment;
				if (c == "\n") {
					state = SyntaxState.Normal;
				}
				break;
			case SyntaxState.MLComment:
				data[j++] = SyntaxCategory.Comment;

				if (c == "*" && !isLast && src[i+1] == "/") {
					i++;
					data[j++] = SyntaxCategory.Comment;
					state = SyntaxState.Normal;
				}
				break;
			case SyntaxState.String:
				data[j++] = SyntaxCategory.Literal;

				if (c == "\"") {
					state = SyntaxState.Normal;
				}
				break;
			case SyntaxState.NumberStart:
				if (c == "x") {
					data[j++] = SyntaxCategory.Literal;
					state = SyntaxState.HexNumber;
				} else if (c == "o") {
					data[j++] = SyntaxCategory.Literal;
					state = SyntaxState.OctalNumber;
				} else if (c == "b") {
					data[j++] = SyntaxCategory.Literal;
					state = SyntaxState.BinaryNumber;
				} else if (c >= "0" && c <= "9") {
					data[j++] = SyntaxCategory.Literal;
					state = SyntaxState.DecimalNumber;
				} else {
					i--;
					state = SyntaxState.Normal;
				}
				break;
			case SyntaxState.DecimalNumber:
				if (c >= "0" && c <= "9") {
					data[j++] = SyntaxCategory.Literal;
				} else {
					i--;
					state = SyntaxState.Normal;
				}
				break;
			case SyntaxState.HexNumber:
			case SyntaxState.ByteArray:
				if ((c >= "a" && c <= "f") || (c >= "0" && c <= "9")) {
					data[j++] = SyntaxCategory.Literal;
				} else {
					i--;
					state = SyntaxState.Normal;
				}
				break;
			case SyntaxState.OctalNumber:
				if (c >= "0" && c <= "7") {
					data[j++] = SyntaxCategory.Literal;
				} else {
					i--;
					state = SyntaxState.Normal;
				}
				break;
			case SyntaxState.BinaryNumber:
				if (c == "0" || c == "1") {
					data[j++] = SyntaxCategory.Literal;
				} else {
					i--;
					state = SyntaxState.Normal;
				}
				break;
			default:
				throw new Error("unhandled SyntaxState");
		}		
	}

	for (let s of groupStack) {
		data[s.site.pos] = SyntaxCategory.Error;
	}

	return data;
}


/////////////////////////////////////
// Section 8: Type evaluation objects
/////////////////////////////////////

/**
 * Base class of Value and Type.
 * Any member function that takes 'site' as its first argument throws a TypeError if used incorrectly (eg. calling a non-FuncType).
 */
class GeneralizedValue {
	constructor() {
		this.used_ = false;
	}

	/**
	 * @param {Site} site
	 * @returns {Type}
	 */
	assertType(site) {
		throw site.typeError("not a type");
	}

	/**
	 * @returns {boolean}
	 */
	isType() {
		throw new Error("not yet implemented");
	}

	/**
	 * @param {Site} site
	 * @returns {Value}
	 */
	assertValue(site) {
		throw site.typeError("not a value");
	}

	/**
	 * @returns {boolean}
	 */
	isValue() {
		throw new Error("not yet implemented");
	}

	/**
	 * @returns {boolean}
	 */
	isUsed() {
		return this.used_;
	}

	/**
	 * @returns {string}
	 */
	toString() {
		throw new Error("not yet implemented");
	}

	/**
	 * Used by Scope to mark named Values/Types as used.
	 * At the end of the Scope an error is thrown if any named Values/Types aren't used.
	 */
	markAsUsed() {
		this.used_ = true;
	}

	/**
	 * Gets type of a value. Throws error when trying to get type of type.
	 * @param {Site} site
	 * @returns {Type}
	 */
	getType(site) {
		throw new Error("not yet implemented");
	}

	/**
	 * Returns 'true' if 'this' is a base-type of 'type'. Throws an error if 'this' isn't a Type.
	 * @param {Site} site
	 * @param {Type} type
	 * @returns {boolean}
	 */
	isBaseOf(site, type) {
		throw new Error("not yet implemented");
	}

	/**
	 * Returns 'true' if 'this' is an instance of 'type'. Throws an error if 'this' isn't a Value.
	 * 'type' can be a class, or a class instance.
	 * @param {Site} site 
	 * @param {Type | TypeClass} type 
	 * @returns {boolean}
	 */
	isInstanceOf(site, type) {
		throw new Error("not yet implemented");
	}

	/**
	 * Returns the return type of a function (wrapped as a Value) if the args have the correct types. 
	 * Throws an error if 'this' isn't a function value, or if the args don't correspond.
	 * @param {Site} site 
	 * @param {Value[]} args
	 * @returns {Value}
	 */
	call(site, args) {
		throw new Error("not yet implemented");
	}

	/**
	 * Gets a member of a Type (i.e. the '::' operator).
	 * Throws an error if the member doesn't exist or if 'this' isn't a DataType.
	 * @param {Word} name
	 * @returns {GeneralizedValue} - can be Value or Type
	 */
	getTypeMember(name) {
		throw new Error("not yet implemented");
	}

	/**
	 * Gets a member of a Value (i.e. the '.' operator).
	 * Throws an error if the member doesn't exist or if 'this' isn't a DataValue.
	 * @param {Word} name
	 * @returns {Value} - can be FuncValue or DataValue
	 */
	getInstanceMember(name) {
		throw new Error("not yet implemented");
	}

	/**
	 * Returns the number of fields in a struct.
	 * Used to check if a literal struct constructor is correct.
	 * @param {Site} site
	 * @returns {number}
	 */
	nFields(site) {
		throw new Error("not yet implemented");
	}

	/**
	 * Returns the type of struct or enumMember fields.
	 * Used to check if literal struct constructor is correct.
	 * @param {Site} site
	 * @param {number} i
	 * @returns {Type}
	 */
	getFieldType(site, i) {
		throw new Error("not yet implemented");
	}

	/**
	 * Returns the constructor index so UPLC data can be created correctly.
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		throw new Error("not yet implemented");
	}
}

/**
 * Types are used during type-checking of Helios
 */
class Type extends GeneralizedValue {
	constructor() {
		super();
	}

	/**
	 * Compares two types. Throws an error if neither is a Type.
	 * @example
	 * Type.same(Site.dummy(), new IntType(), new IntType()) => true
	 * @param {Site} site 
	 * @param {Type} a 
	 * @param {Type} b 
	 * @returns {boolean}
	 */
	static same(site, a, b) {
		return a.isBaseOf(site, b) && b.isBaseOf(site, a);
	}

	/**
	 * @returns {boolean}
	 */
	isType() {
		return true;
	}

	/**
	 * @param {Site} site
	 * @returns {Type}
	 */
	assertType(site) {
		return this;
	}

	/**
	 * @returns {boolean}
	 */
	isValue() {
		return false;
	}

	/**
	 * Returns the underlying Type. Throws an error in this case because a Type can't return another Type.
	 * @param {Site} site 
	 * @returns {Type}
	 */
	getType(site) {
		throw site.typeError(`can't use getType(), '${this.toString()}' isn't an instance`);
	}

	/**
	 * Throws an error because a Type can't be an instance of another Type.
	 * @param {Site} site 
	 * @param {Type | TypeClass} type
	 * @returns {boolean}
	 */
	isInstanceOf(site, type) {
		throw site.typeError(`can't use isInstanceOf(), '${this.toString()}' isn't an instance`);
	}

	/**
	 * Throws an error because a Type isn't callable.
	 * @param {Site} site 
	 * @param {Value[]} args 
	 * @returns {Value}
	 */
	call(site, args) {
		throw site.typeError("not callable");
	}

	/**
	 * Returns number of members of an enum type
	 * Throws an error if not an enum type
	 * @param {Site} site
	 * @returns {number}
	 */
	nEnumMembers(site) {
		throw site.typeError("not an enum type");
	}

	/**
	 * Returns the base path of type (eg. __helios__bool).
	 * This is used extensively in the Intermediate Representation.
	 * @type {string}
	 */
	get path() {
		throw new Error("not implemented")
	}
}

/**
 * AnyType matches any other type in the type checker.
 */
class AnyType extends Type {
	constructor() {
		super();
	}

	/**
	 * @param {Site} site 
	 * @param {Type} other 
	 * @returns {boolean}
	 */
	isBaseOf(site, other) {
		return true;
	}
}

/**
 * Base class of non-FuncTypes.
 */
class DataType extends Type {
	constructor() {
		super();
	}

	/**
	 * @param {Site} site 
	 * @param {Type} type 
	 * @returns {boolean}
	 */
	isBaseOf(site, type) {
		return Object.getPrototypeOf(this) == Object.getPrototypeOf(type);
	}
}

/**
 * Matches everything except FuncType.
 * Used by find_datum_hash.
 */
class AnyDataType extends Type {
	constructor() {
		super();
	}

	/**
	 * @param {Site} site
	 * @param {Type} other
	 * @returns {boolean}
	 */
	isBaseOf(site, other) {
		return !(other instanceof FuncType);
	}
}

/**
 * Base class of all builtin types (eg. IntType)
 * Note: any builtin type that inherits from BuiltinType must implement get path()
 */
class BuiltinType extends DataType {
	#macrosAllowed; // macros are allowed after the definition of the main function

	constructor() {
		super();
		this.#macrosAllowed = false;
	}

	allowMacros() {
		this.#macrosAllowed = true;
	}

	get macrosAllowed() {
		return this.#macrosAllowed;
	}

	/**
	 * Returns Type member (i.e. '::' operator).
	 * @param {Word} name
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "from_data":
				return Value.new(new FuncType([new RawDataType()], this));
			default:
				throw name.referenceError(`${this.toString()}::${name.value} undefined`);
		}
	}

	/**
	 * Returns one of default instance members, or throws an error.
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "serialize":
				return Value.new(new FuncType([], new ByteArrayType()));
			case "__eq":
			case "__neq":
				return Value.new(new FuncType([this], new BoolType()));
			default:
				throw name.referenceError(`${this.toString()}.${name.value} undefined`);
		}
	}

	/**
	 * Returns the number of data fields in a builtin type (not yet used)
	 * @param {Site} site 
	 * @returns {number}
	 */
	nFields(site) {
		return 0;
	}

	/**
	 * Returns the constructor index of a builtin type (eg. 1 for Option::None).
	 * By default non-enum builtin types that are encoded as Plutus-Core data use the '0' constructor index.
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		return 0;
	}

	/**
	 * Use 'path' getter instead of 'toIR()' in order to get the base path.
	 */
	toIR() {
		throw new Error("use path getter instead");
	}
}

class BuiltinEnumMember extends BuiltinType {
	#parentType;

	/**
	 * @param {BuiltinType} parentType 
	 */
	constructor(parentType) {
		super();
		this.#parentType = parentType;
	}

	get parentType() {
		return this.#parentType;
	}
}

/**
 * Type wrapper for Struct statements and Enums and Enum members.
 */
class StatementType extends DataType {
	#statement;

	/**
	 * @param {StructStatement | EnumMember | EnumStatement} statement 
	 */
	constructor(statement) {
		super();
		this.#statement = statement;
	}

	/**
	 * @returns {StructStatement | EnumMember | EnumStatement}
	 */
	get statement() {
		return this.#statement;
	}

	/**
	 * @param {Site} site 
	 * @param {Type} type 
	 * @returns {boolean}
	 */
	isBaseOf(site, type) {
		if (type instanceof StatementType) {
			return type.path.startsWith(this.path);
		} else {
			return false;
		}
	}

	/**
	 * Returns the name of the type.
	 * @returns {string}
	 */
	toString() {
		return this.#statement.name.toString();
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		return this.#statement.getTypeMember(name);
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		return this.#statement.getInstanceMember(name);
	}

	/**
	 * Returns the number of fields in a Struct or in an EnumMember.
	 * @param {Site} site 
	 * @returns {number}
	 */
	nFields(site) {
		return this.#statement.nFields(site);
	}

	/**
	 * Returns the i-th field of a Struct or an EnumMember
	 * @param {Site} site
	 * @param {number} i
	 * @returns {Type}
	 */
	getFieldType(site, i) {
		return this.#statement.getFieldType(site, i);
	}

	/**
	 * Returns the constructor index so that __core__constrData can be called correctly.
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		return this.#statement.getConstrIndex(site);
	}

	/**
	 * Returns the number of members of an EnumStatement
	 * @param {Site} site
	 * @returns {number}
	 */
	nEnumMembers(site) {
		return this.#statement.nEnumMembers(site);
	}

	get path() {
		return this.#statement.path;
	}

	/**
	 * A StatementType can instantiate itself if the underlying statement is an enum member with no fields
	 * @param {Site} site
	 * @returns {Value}
	 */
	assertValue(site) {
		if (this.#statement instanceof EnumMember) {
			if (this.#statement.nFields(site) == 0) {
				return Value.new(this);
			} else {
				throw site.typeError(`expected '{...}' after '${this.#statement.name.toString()}'`);
			}
		} else {
			throw site.typeError(`expected a value, got a type`);
		}
	}
}

/**
 * Function type with arg types and a return type
 */
class FuncType extends Type {
	#argTypes;
	#retType;

	/**
	 * @param {Type[]} argTypes 
	 * @param {Type} retType 
	 */
	constructor(argTypes, retType) {
		super();
		this.#argTypes = argTypes;
		this.#retType = retType;
	}

	get nArgs() {
		return this.#argTypes.length;
	}

	get argTypes() {
		return this.#argTypes.slice();
	}

	get retType() {
		return this.#retType;
	}

	/**
	 * @returns {string}
	 */
	toString() {
		return `(${this.#argTypes.map(a => a.toString()).join(", ")}) -> ${this.#retType.toString()}`;
	}

	/**
	 * Checks if the type of the first arg is the same as 'type'
	 * Also returns false if there are no args.
	 * For a method to be a valid instance member its first argument must also be named 'self', but that is checked elsewhere
	 * @param {Site} site 
	 * @param {Type} type 
	 * @returns {boolean}
	 */
	isMaybeMethod(site, type) {
		if (this.#argTypes.length > 0) {
			return Type.same(site, this.#argTypes[0], type);
		} else {
			return false;
		}
	}

	/** 
	 * Checks if any of 'this' argTypes or retType is same as Type.
	 * Only if this checks return true is the association allowed.
	 * @param {Site} site
	 * @param {Type} type
	 * @returns {boolean}
	 */
	isAssociated(site, type) {
		for (let arg of this.#argTypes) {
			if (Type.same(site, arg, type)) {
				return true;
			}
		}

		if (Type.same(site, type, this.#retType)) {
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Checks if 'this' is a base type of another FuncType.
	 * The number of args needs to be the same.
	 * Each argType of the FuncType we are checking against needs to be the same or less specific (i.e. isBaseOf(this.#argTypes[i]))
	 * The retType of 'this' needs to be the same or more specific
	 * @param {Site} site 
	 * @param {Type} type 
	 * @returns {boolean}
	 */
	isBaseOf(site, type) {
		if (type instanceof FuncType) {
			if (this.nArgs != type.nArgs) {
				return false;
			} else {
				for (let i = 0; i < this.nArgs; i++) {
					if (!type.#argTypes[i].isBaseOf(site, this.#argTypes[i])) { // note the reversal of the check
						return false;
					}
				}

				return this.#retType.isBaseOf(site, type.#retType);
			}

		} else {
			return false;
		}
	}
	
	/**
	 * Checks if arg types are valid.
	 * Throws errors if not valid. Returns the return type if valid. 
	 * @param {Site} site 
	 * @param {Value[]} args 
	 * @returns {Type}
	 */
	checkCall(site, args) {
		if (this.nArgs != args.length) {
			throw site.typeError(`expected ${this.nArgs} arg(s), got ${args.length} arg(s)`);
		}

		for (let i = 0; i < this.nArgs; i++) {
			if (!args[i].isInstanceOf(site, this.#argTypes[i])) {
				throw site.typeError(`expected '${this.#argTypes[i].toString()}' for arg ${i + 1}, got '${args[i].toString()}'`);
			}
		}

		return this.#retType;
	}
}

/**
 * Base class for DataValue and FuncValue
 */
class Value extends GeneralizedValue {
	constructor() {
		super();
	}

	/**
	 * @param {Type} type 
	 * @returns {Value}
	 */
	static new(type) {
		if (type instanceof FuncType) {
			return new FuncValue(type);
		} else {
			return new DataValue(type);
		}
	}

	/**
	 * @returns {boolean}
	 */
	isType() {
		return false;
	}

	/**
	 * @returns {boolean}
	 */
	isValue() {
		return true;
	}

	/**
	 * @param {Site} site
	 * @returns {Value}
	 */
	assertValue(site) {
		return this;
	}

	/**
	 * Throws an error because a Value isn't a Type can't be a base-Type of anything.
	 * @param {Site} site 
	 * @param {Type} type 
	 * @returns {boolean}
	 */
	isBaseOf(site, type) {
		throw site.typeError("not a type");
	}
}

/**
 * A regular non-Func Value. DataValues can always be compared, serialized, used in containers.
 */
class DataValue extends Value {
	#type;

	/**
	 * @param {DataType} type 
	 */
	constructor(type) {
		assert(!(type instanceof FuncType));

		super();
		this.#type = type;
	}

	/**
	 * @returns {string}
	 */
	toString() {
		return this.#type.toString();
	}

	/**
	 * Gets the underlying Type.
	 * @param {Site} site 
	 * @returns {Type}
	 */
	getType(site) {
		return this.#type;
	}

	/**
	 * @typedef {new(...any) => Type} TypeClass
	 */

	/**
	 * Checks if 'this' is instance of 'type'.
	 * 'type' can be a class, or a class instance.
	 * @param {Site} site 
	 * @param {Type | TypeClass} type 
	 * @returns 
	 */
	isInstanceOf(site, type) {
		if (typeof type == 'function') {
			return this.#type instanceof type;
		} else {
			return type.isBaseOf(site, this.#type);
		}
	}

	/**
	 * Returns the number of fields of a struct, enum member, or builtin type.
	 * @param {Site} site 
	 * @returns {number}
	 */
	nFields(site) {
		return this.#type.nFields(site);
	}

	/**
	 * Returns the i-th field of a Struct or an EnumMember
	 * @param {Site} site
	 * @param {number} i
	 * @returns {Type}
	 */
	getFieldType(site, i) {
		return this.#type.getFieldType(site, i);
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		return this.#type.getInstanceMember(name);
	}

	/**
	 * Throws an error bec
	 * @param {Site} site 
	 * @param {Value[]} args 
	 * @returns {Value}
	 */
	call(site, args) {
		throw site.typeError("not callable");
	}
}

/**
 * A callable Value.
 */
class FuncValue extends Value {
	#type;

	/**
	 * @param {FuncType} type 
	 */
	constructor(type) {
		assert(type instanceof FuncType);

		super();
		this.#type = type;
	}

	get nArgs() {
		return this.#type.nArgs;
	}

	/**
	 * @param {Scope} scope
	 * @returns {boolean}
	 */
	isRecursive(scope) {
		return false;
	}

	/**
	 * Returns a string representing the type.
	 * @returns {string}
	 */
	toString() {
		return this.#type.toString();
	}

	/**
	 * Returns the underlying FuncType as Type.
	 * @param {Site} site
	 * @returns {Type}
	 */
	getType(site) {
		return this.#type;
	}

	/**
	 * Returns the underlying FuncType directly.
	 * @returns {FuncType}
	 */
	getFuncType() {
		return this.#type;
	}

	/**
	 * Checks if 'this' is an instance of 'type'.
	 * Type can be a class or a class instance. 
	 * @param {Site} site 
	 * @param {Type | TypeClass} type 
	 * @returns {boolean}
	 */
	isInstanceOf(site, type) {
		if (typeof type == 'function') {
			return this.#type instanceof type;
		} else {
			return type.isBaseOf(site, this.#type);
		}
	}

	/**
	 * @param {Site} site 
	 * @param {Value[]} args 
	 * @returns {Value}
	 */
	call(site, args) {
		return Value.new(this.#type.checkCall(site, args));
	}

	/**
	 * Throws an error because a function value doesn't have any fields.
	 * @param {Site} site 
	 * @returns {number}
	 */
	nFields(site) {
		throw site.typeError("a function doesn't have fields");
	}

	/**
	 * Throws an error because a function value doens't have any fields.
	 * @param {Site} site
	 * @param {number} i
	 * @returns {Type}
	 */
	getFieldType(site, i) {
		throw site.typeError("a function doesn't have fields");
	}

	/**
	 * Throws an error because a function value doesn't have members.
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		throw name.typeError("a function doesn't have any members");
	}
}

/**
 * Special function value class for top level functions because they can be used recursively.s
 */
class FuncStatementValue extends FuncValue {
	#statement

	/**
	 * @param {FuncType} type 
	 * @param {FuncStatement} statement 
	 */
	constructor(type, statement) {
		super(type);
		this.#statement = statement;
	}

	/**
	 * @param {Scope} scope
	 * @returns {boolean}
	 */
	isRecursive(scope) {
		if (this.#statement.isRecursive()) {
			return true;
		} else {
			return scope.isRecursive(this.#statement);
		}
	}
}


////////////////////
// Section 9: Scopes
////////////////////

/**
 * GlobalScope sits above the top-level scope and contains references to all the builtin Values and Types
 */
class GlobalScope {
	/**
	 * @type {[Word, GeneralizedValue][]}
	 */
	#values;

	constructor() {
		this.#values = [];
	}

	/**
	 * Checks if scope contains a name
	 * @param {Word} name 
	 * @returns {boolean}
	 */
	has(name) {
		for (let pair of this.#values) {
			if (pair[0].toString() == name.toString()) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Sets a global name, doesn't check for uniqueness
	 * Called when initializing GlobalScope
	 * @param {string | Word} name
	 * @param {GeneralizedValue} value
	 */
	set(name, value) {
		/** @type {Word} */
		let nameWord = !(name instanceof Word) ? Word.new(name) : name;

		this.#values.push([nameWord, value]);
	}

	/**
	 * Gets a named value from the scope.
	 * Throws an error if not found.
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	get(name) {
		for (let pair of this.#values) {
			if (pair[0].toString() == name.toString()) {
				pair[1].markAsUsed();
				return pair[1];
			}
		}

		throw name.referenceError(`'${name.toString()}' undefined`);
	}

	/**
	 * Check if funcstatement is called recursively (always false here)
	 * @param {FuncStatement} statement
	 * @returns {boolean}
	 */
	isRecursive(statement) {
		return false;
	}

	/**
	 * Initialize the GlobalScope with all the builtins
	 * @param {number} purpose
	 * @returns {GlobalScope}
	 */
	static new(purpose) {
		let scope = new GlobalScope();

		// List (aka '[]'), Option, and Map types are accessed through special expressions

		// fill the global scope with builtin types
		scope.set("Int", new IntType());
		scope.set("Bool", new BoolType());
		scope.set("String", new StringType());
		scope.set("ByteArray", new ByteArrayType());
		scope.set("PubKeyHash", new PubKeyHashType());
		scope.set("ValidatorHash", new ValidatorHashType(purpose));
		scope.set("MintingPolicyHash", new MintingPolicyHashType(purpose));
		scope.set("DatumHash", new DatumHashType());
		scope.set("ScriptContext", new ScriptContextType(purpose));
		scope.set("StakingPurpose", new StakingPurposeType());
		scope.set("DCert", new DCertType());
		scope.set("Tx", new TxType());
		scope.set("TxId", new TxIdType());
		scope.set("TxInput", new TxInputType());
		scope.set("TxOutput", new TxOutputType());
		scope.set("OutputDatum", new OutputDatumType());
		scope.set("Data", new RawDataType());
		scope.set("TxOutputId", new TxOutputIdType());
		scope.set("Address", new AddressType());
		scope.set("Credential", new CredentialType());
		scope.set("StakingCredential", new StakingCredentialType());
		scope.set("Time", new TimeType());
		scope.set("Duration", new DurationType());
		scope.set("TimeRange", new TimeRangeType());
		scope.set("AssetClass", new AssetClassType());
		scope.set("Value", new MoneyValueType());

		return scope;
	}

	allowMacros() {
		for (let [_, value] of this.#values) {
			if (value instanceof BuiltinType) {
				value.allowMacros();
			}
		}
	}
}

/**
 * User scope
 */
class Scope {
	/** @type {GlobalScope | Scope} */
	#parent;

	/** @type {[Word, GeneralizedValue][]} */
	#values;

	/**
	 * @param {GlobalScope | Scope} parent 
	 */
	constructor(parent) {
		this.#parent = parent;
		this.#values = []; // list of pairs
	}

	/**
	 * Used by top-scope to loop over all the statements
	 */
	get values() {
		return this.#values.slice();
	}

	/**
	 * Checks if scope contains a name
	 * @param {Word} name 
	 * @returns {boolean}
	 */
	has(name) {
		for (let pair of this.#values) {
			if (pair[0].toString() == name.toString()) {
				return true;
			}
		}

		if (this.#parent !== null) {
			return this.#parent.has(name);
		} else {
			return false;
		}
	}

	/**
	 * Sets a named value. Throws an error if not unique
	 * @param {Word} name 
	 * @param {GeneralizedValue} value 
	 */
	set(name, value) {
		if (this.has(name)) {
			throw name.syntaxError(`'${name.toString()}' already defined`);
		}

		this.#values.push([name, value]);
	}

	/**
	 * Gets a named value from the scope. Throws an error if not found
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	get(name) {
		if (!(name instanceof Word)) {
			name = Word.new(name);
		}

		for (let pair of this.#values) {
			if (pair[0].toString() == name.toString()) {
				pair[1].markAsUsed();
				return pair[1];
			}
		}

		if (this.#parent !== null) {
			return this.#parent.get(name);
		} else {
			throw name.referenceError(`'${name.toString()}' undefined`);
		}
	}

	/**
	 * Check if function statement is called recursively
	 * @param {FuncStatement} statement
	 * @returns {boolean}
	 */
	isRecursive(statement) {
		return this.#parent.isRecursive(statement);
	}

	/**
	 * Asserts that all named values are user.
	 * Throws an error if some are unused.
	 */
	assertAllUsed() {
		for (let pair of this.#values) {
			if (!pair[1].isUsed()) {
				throw pair[0].referenceError(`'${pair[0].toString()}' unused`);
			}
		}
	}
}

/**
 * TopScope is a special scope that can contain UserTypes
 */
class TopScope extends Scope {
	/**
	 * @param {GlobalScope} parent 
	 */
	constructor(parent) {
		super(parent);
	}

	/**
	 * @param {Word} name 
	 * @param {GeneralizedValue} value 
	 */
	set(name, value) {
		super.set(name, value);
	}
}

/**
 * FuncStatementScope is a special scope used to detect recursion
 */
class FuncStatementScope extends Scope {
	#statement;

	/**
	 * @param {Scope} parent
	 * @param {FuncStatement} statement
	 */
	constructor(parent, statement) {
		super(parent);

		this.#statement = statement;
	}

	/**
	 * @param {FuncStatement} statement 
	 * @returns {boolean}
	 */
	isRecursive(statement) {
		if (this.#statement === statement) {
			this.#statement.setRecursive();
			return true;
		} else {
			return super.isRecursive(statement);
		}
	}
}


////////////////////////////////////
// Section 10: AST expression objects
////////////////////////////////////

/**
 * Base class of every Type and Value expression.
 */
class Expr extends Token {
	/**
	 * @param {Site} site 
	 */
	constructor(site) {
		super(site);
	}
}

/**
 * Base class of every Type expression
 * Caches evaluated Type.
 */
class TypeExpr extends Expr {
	#cache;

	/**
	 * @param {Site} site 
	 * @param {?Type} cache
	 */
	constructor(site, cache = null) {
		super(site);
		this.#cache = cache;
	}

	get type() {
		if (this.#cache === null) {
			throw new Error("type not yet evaluated");
		} else {
			return this.#cache;
		}
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Type}
	 */
	evalInternal(scope) {
		throw new Error("not yet implemented");
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Type}
	 */
	eval(scope) {
		if (this.#cache === null) {
			this.#cache = this.evalInternal(scope);
		}

		return this.#cache;
	}
}

/**
 * Type reference class (i.e. using a Word)
 */
class TypeRefExpr extends TypeExpr {
	#name;

	/**
	 * @param {Word} name 
	 */
	constructor(name) {
		super(name.site);
		this.#name = name;
	}

	/**
	 * @returns {string}
	 */
	toString() {
		return this.#name.toString();
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Type}
	 */
	evalInternal(scope) {
		let type = scope.get(this.#name);

		return type.assertType(this.#name.site);
	}

	get path() {
		return this.type.path;
	}
}

/**
 * Type::Member expression
 */
class TypePathExpr extends TypeExpr {
	#baseExpr;
	#memberName;

	/**
	 * @param {Site} site 
	 * @param {TypeExpr} baseExpr 
	 * @param {Word} memberName
	 */
	constructor(site, baseExpr, memberName) {
		super(site);
		this.#baseExpr = baseExpr;
		this.#memberName = memberName;
	}

	toString() {
		return `${this.#baseExpr.toString()}::${this.#memberName.toString()}`;
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Type}
	 */
	evalInternal(scope) {
		let enumType = this.#baseExpr.eval(scope);

		let memberType = enumType.getTypeMember(this.#memberName);

		return memberType.assertType(this.#memberName.site);
	}

	get path() {
		return this.type.path;
	}
}

class ListTypeExpr extends TypeExpr {
	#itemTypeExpr;

	/**
	 * @param {Site} site 
	 * @param {TypeExpr} itemTypeExpr 
	 */
	constructor(site, itemTypeExpr) {
		super(site);
		this.#itemTypeExpr = itemTypeExpr;
	}

	toString() {
		return `[]${this.#itemTypeExpr.toString()}`;
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Type}
	 */
	evalInternal(scope) {
		let itemType = this.#itemTypeExpr.eval(scope);

		if (itemType instanceof FuncType) {
			throw this.#itemTypeExpr.typeError("list item type can't be function");
		}

		return new ListType(itemType);
	}
}

/**
 * Map[KeyType]ValueType expression
 */
class MapTypeExpr extends TypeExpr {
	#keyTypeExpr;
	#valueTypeExpr;

	/**
	 * @param {Site} site 
	 * @param {TypeExpr} keyTypeExpr 
	 * @param {TypeExpr} valueTypeExpr 
	 */
	constructor(site, keyTypeExpr, valueTypeExpr) {
		super(site);
		this.#keyTypeExpr = keyTypeExpr;
		this.#valueTypeExpr = valueTypeExpr;
	}

	toString() {
		return `Map[${this.#keyTypeExpr.toString()}]${this.#valueTypeExpr.toString()}`;
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Type}
	 */
	evalInternal(scope) {
		let keyType = this.#keyTypeExpr.eval(scope);

		if (keyType instanceof FuncType) {
			throw this.#keyTypeExpr.typeError("map key type can't be function");
		} else if (keyType instanceof BoolType) {
			throw this.#keyTypeExpr.typeError("map key type can't be a boolean");
		}

		let valueType = this.#valueTypeExpr.eval(scope);

		if (valueType instanceof FuncType) {
			throw this.#valueTypeExpr.typeError("map value type can't be function");
		}

		return new MapType(keyType, valueType);
	}
}

/**
 * Option[SomeType] expression
 */
class OptionTypeExpr extends TypeExpr {
	#someTypeExpr;

	/**
	 * @param {Site} site 
	 * @param {TypeExpr} someTypeExpr 
	 */
	constructor(site, someTypeExpr) {
		super(site);
		this.#someTypeExpr = someTypeExpr;
	}

	toString() {
		return `Option[${this.#someTypeExpr.toString()}]`;
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Type}
	 */
	evalInternal(scope) {
		let someType = this.#someTypeExpr.eval(scope);

		if (someType instanceof FuncType) {
			throw this.#someTypeExpr.typeError("option some type can't be function");
		}

		return new OptionType(someType);
	}
}

/**
 * (ArgType1, ...) -> RetType expression
 */
class FuncTypeExpr extends TypeExpr {
	#argTypeExprs;
	#retTypeExpr;

	/**
	 * @param {Site} site 
	 * @param {TypeExpr[]} argTypeExprs 
	 * @param {TypeExpr} retTypeExpr 
	 */
	constructor(site, argTypeExprs, retTypeExpr) {
		super(site);
		this.#argTypeExprs = argTypeExprs;
		this.#retTypeExpr = retTypeExpr;
	}

	/**
	 * @returns {string}
	 */
	toString() {
		return `(${this.#argTypeExprs.map(a => a.toString()).join(", ")}) -> ${this.#retTypeExpr.toString()}`;
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Type}
	 */
	evalInternal(scope) {
		let argTypes = this.#argTypeExprs.map(a => a.eval(scope));

		let retType = this.#retTypeExpr.eval(scope);

		return new FuncType(argTypes, retType);
	}
}

/**
 * Base class of expression that evaluate to Values.
 */
class ValueExpr extends Expr {
	/** @type {?Value} */
	#cache;

	/**
	 * @param {Site} site 
	 */
	constructor(site) {
		super(site);

		this.#cache = null;
	}

	get value() {
		if (this.#cache === null) {
			throw new Error("type not yet evaluated");
		} else {
			return this.#cache;
		}
	}

	get type() {
		return this.value.getType(this.site);
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Value}
	 */
	evalInternal(scope) {
		throw new Error("not yet implemented");
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Value}
	 */
	eval(scope) {
		if (this.#cache === null) {
			this.#cache = this.evalInternal(scope);
		}

		return this.#cache;
	}

	/**
	 * Returns Intermediate Representation of a value expression.
	 * The IR should be indented to make debugging easier.
	 * @param {string} indent 
	 * @returns {IR}
	 */
	toIR(indent = "") {
		throw new Error("not implemented");
	}
}

/**
 * '... = ... ; ...' expression
 */
class AssignExpr extends ValueExpr {
	#name;
	#typeExpr;
	#upstreamExpr;
	#downstreamExpr;

	/**
	 * @param {Site} site 
	 * @param {Word} name 
	 * @param {?TypeExpr} typeExpr - typeExpr can null for type inference (only works for literal rhs though)
	 * @param {ValueExpr} upstreamExpr 
	 * @param {ValueExpr} downstreamExpr 
	 */
	constructor(site, name, typeExpr, upstreamExpr, downstreamExpr) {
		super(site);
		this.#name = name;
		this.#typeExpr = typeExpr; // optionally can be null for type inference
		this.#upstreamExpr = assertDefined(upstreamExpr);
		this.#downstreamExpr = assertDefined(downstreamExpr);
	}

	/**
	 * @returns {string}
	 */
	toString() {
		let downstreamStr = this.#downstreamExpr.toString();
		assert(downstreamStr != undefined);

		let typeStr = "";
		if (this.#typeExpr !== null) {
			typeStr = `: ${this.#typeExpr.toString()}`;
		}
		return `${this.#name.toString()}${typeStr} = ${this.#upstreamExpr.toString()}; ${downstreamStr}`;
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Value}
	 */
	evalInternal(scope) {
		let subScope = new Scope(scope);

		let upstreamVal = this.#upstreamExpr.eval(scope);

		assert(upstreamVal.isValue());

		if (this.#typeExpr !== null) {
			let type = this.#typeExpr.eval(scope);

			assert(type.isType());

			if (!upstreamVal.isInstanceOf(this.#upstreamExpr.site, type)) {
				throw this.#upstreamExpr.typeError(`expected ${type.toString()}, got ${upstreamVal.toString()}`);
			}
		} else {
			if (!(this.#upstreamExpr.isLiteral())) {
				throw this.typeError("unable to infer type of assignment rhs");
			}
		}

		subScope.set(this.#name, upstreamVal);

		let downstreamVal = this.#downstreamExpr.eval(subScope);

		subScope.assertAllUsed();

		return downstreamVal;
	}

	/**
	 * 
	 * @param {string} indent 
	 * @returns {IR}
	 */
	toIR(indent = "") {
		return new IR([
			new IR(`(${this.#name.toString()}) `), new IR("->", this.site), new IR(` {\n${indent}${TAB}`),
			this.#downstreamExpr.toIR(indent + TAB),
			new IR(`\n${indent}}(`),
			this.#upstreamExpr.toIR(indent),
			new IR(")")
		]);
	}
}

/**
 * print(...); ... expression
 */
class PrintExpr extends ValueExpr {
	#msgExpr;
	#downstreamExpr;

	/**
	 * @param {Site} site 
	 * @param {ValueExpr} msgExpr 
	 * @param {ValueExpr} downstreamExpr 
	 */
	constructor(site, msgExpr, downstreamExpr) {
		super(site);
		this.#msgExpr = msgExpr;
		this.#downstreamExpr = downstreamExpr;
	}

	/**
	 * @returns {string}
	 */
	toString() {
		let downstreamStr = this.#downstreamExpr.toString();
		assert(downstreamStr != undefined);
		return `print(${this.#msgExpr.toString()}); ${downstreamStr}`;
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Value}
	 */
	evalInternal(scope) {
		let msgVal = this.#msgExpr.eval(scope);

		assert(msgVal.isValue());

		if (!msgVal.isInstanceOf(this.#msgExpr.site, StringType)) {
			throw this.#msgExpr.typeError("expected string arg for print");
		}

		let downstreamVal = this.#downstreamExpr.eval(scope);

		return downstreamVal;
	}

	/**
	 * @param {string} indent 
	 * @returns {IR}
	 */
	toIR(indent = "") {
		return new IR([
			new IR("__core__trace", this.site), new IR("("), new IR("__helios__common__unStringData("),
			this.#msgExpr.toIR(indent),
			new IR(`), () -> {\n${indent}${TAB}`),
			this.#downstreamExpr.toIR(indent + TAB),
			new IR(`\n${indent}})()`)
		]);
	}
}

/**
 * Literal expression class (wraps literal tokens)
 */
class PrimitiveLiteralExpr extends ValueExpr {
	#primitive;

	/**
	 * @param {PrimitiveLiteral} primitive 
	 */
	constructor(primitive) {
		super(primitive.site);
		this.#primitive = primitive;
	}

	isLiteral() {
		return true;
	}

	/**
	 * @returns {string}
	 */
	toString() {
		return this.#primitive.toString();
	}

	/**
	 * @type {Type}
	 */
	get type() {
		if (this.#primitive instanceof IntLiteral) {
			return new IntType();
		} else if (this.#primitive instanceof BoolLiteral) {
			return new BoolType();
		} else if (this.#primitive instanceof StringLiteral) {
			return new StringType();
		} else if (this.#primitive instanceof ByteArrayLiteral) {
			return new ByteArrayType(this.#primitive.bytes.length == 32 ? 32 : null);
		} else {
			throw new Error("unhandled primitive type");
		}	
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Value}
	 */
	evalInternal(scope) {
		return new DataValue(this.type);
	}

	/**
	 * @param {string} indent
	 * @returns {IR}
	 */
	toIR(indent = "") {
		// all literals can be reused in their string-form in the IR
		let inner = new IR(this.#primitive.toString(), this.#primitive.site);

		if (this.#primitive instanceof IntLiteral) {
			return new IR([new IR("__core__iData", this.site), new IR("("), inner, new IR(")")]);
		} else if (this.#primitive instanceof BoolLiteral) {
			return inner;
		} else if (this.#primitive instanceof StringLiteral) {
			return new IR([new IR("__helios__common__stringData", this.site), new IR("("), inner, new IR(")")]);
		} else if (this.#primitive instanceof ByteArrayLiteral) {
			return new IR([new IR("__core__bData", this.site), new IR("("), inner, new IR(")")]);
		} else {
			throw new Error("unhandled primitive type");
		}
	}
}

/**
 * Struct field (part of a literal struct constructor)
 */
class StructLiteralField {
	#name;
	#value;

	/**
	 * @param {?Word} name 
	 * @param {ValueExpr} value 
	 */
	constructor(name, value) {
		this.#name = name;
		this.#value = value;
	}

	get site() {
		if (this.#name === null) {
			return this.#value.site;
		} else {
			return this.#name.site;
		}
	}

	/**
	 * @returns {boolean}
	 */
	isNamed() {
		return this.#name !== null;
	}

	get name() {
		if (this.#name === null) {
			throw new Error("name of field not given");
		} else {
			return this.#name;
		}
	}

	toString() {
		if (this.#name === null) {
			return this.#value.toString();
		} else {
			return `${this.#name.toString()}: ${this.#value.toString()}`;
		}
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Value}
	 */
	eval(scope) {
		return this.#value.eval(scope);
	}

	/**
	 * @param {string} indent 
	 * @returns {IR}
	 */
	toIR(indent = "") {
		return this.#value.toIR(indent);
	}
}

/**
 * Struct literal constructor
 */
class StructLiteralExpr extends ValueExpr {
	#typeExpr;
	#fields;
	/** @type {?number} - set during evaluation */
	#constrIndex;

	/**
	 * @param {TypeExpr} typeExpr 
	 * @param {StructLiteralField[]} fields 
	 */
	constructor(typeExpr, fields) {
		super(typeExpr.site);
		this.#typeExpr = typeExpr;
		this.#fields = fields;
		this.#constrIndex = null;
	}

	isLiteral() {
		return true;
	}

	toString() {
		return `${this.#typeExpr.toString()}{${this.#fields.map(f => f.toString()).join(", ")}}`;
	}

	/**
	 * @param {Scope} scope 
	 * @returns 
	 */
	evalInternal(scope) {
		let type = this.#typeExpr.eval(scope);

		assert(type.isType());

		this.#constrIndex = type.getConstrIndex(this.site);

		let instance = Value.new(type);

		if (instance.nFields(this.site) != this.#fields.length) {
			throw this.typeError("wrong number of fields");
		}

		for (let i = 0; i < this.#fields.length; i++) {
			let f = this.#fields[i];
		
			let fieldVal = f.eval(scope);

			if (f.isNamed()) {
				// check the named type
				let memberType = instance.getInstanceMember(f.name).getType(f.name.site);

				if (!fieldVal.isInstanceOf(f.site, memberType)) {
					throw f.site.typeError(`wrong field type for '${f.name.toString()}'`);
				}
			}
			
			// check the positional type
			let memberType = instance.getFieldType(f.site, i);
			
			if (!fieldVal.isInstanceOf(f.site, memberType)) {
				if (f.isNamed()) {
					throw f.site.typeError("wrond field order");
				} else {
					throw f.site.typeError("wrong field type");
				}
			}
		}

		return instance;
	}

	/**
	 * @param {string} indent
	 * @returns {IR}
	 */
	toIR(indent = "") {
		let res = new IR("__core__mkNilData(())");

		let fields = this.#fields.slice().reverse();

		let instance = Value.new(this.#typeExpr.type);

		for (let i = 0; i < fields.length; i++) {
			let f = fields[i];

			let isBool = instance.getFieldType(f.site, i) instanceof BoolType;

			let fIR = f.toIR(indent);

			if (isBool) {
				fIR = new IR([
					new IR("__helios__common__boolData("),
					fIR,
					new IR(")"),
				]);
			}

			res = new IR([
				new IR("__core__mkCons("),
				fIR,
				new IR(", "),
				res,
				new IR(")")
			]);
		}

		let idx = this.#constrIndex;
		if (idx === null) {
			throw new Error("constrIndex not yet set");
		} else {
			return new IR([
				new IR("__core__constrData", this.site), new IR(`(${idx.toString()}, `),
				res,
				new IR(")")
			]);
		}
	}
}

/**
 * []{...} expression
 */
class ListLiteralExpr extends ValueExpr {
	#itemTypeExpr;
	#itemExprs;

	/**
	 * @param {Site} site 
	 * @param {TypeExpr} itemTypeExpr 
	 * @param {ValueExpr[]} itemExprs 
	 */
	constructor(site, itemTypeExpr, itemExprs) {
		super(site);
		this.#itemTypeExpr = itemTypeExpr;
		this.#itemExprs = itemExprs;
	}

	isLiteral() {
		return true;
	}

	toString() {
		return `[]${this.#itemTypeExpr.toString()}{${this.#itemExprs.map(itemExpr => itemExpr.toString()).join(', ')}}`;
	}

	/**
	 * @param {Scope} scope
	 */
	evalInternal(scope) {
		let itemType = this.#itemTypeExpr.eval(scope);

		if (itemType instanceof FuncType) {
			throw this.#itemTypeExpr.typeError("content of list can't be func");
		}

		for (let itemExpr of this.#itemExprs) {
			let itemVal = itemExpr.eval(scope);

			if (!itemVal.isInstanceOf(itemExpr.site, itemType)) {
				throw itemExpr.typeError(`expected ${itemType.toString()}, got ${itemVal.toString()}`);
			}
		}

		return Value.new(new ListType(itemType));
	}

	/**
	 * @param {string} indent 
	 * @returns {IR}
	 */
	toIR(indent = "") {
		let isBool = this.#itemTypeExpr.type instanceof BoolType;

		// unsure if list literals in untyped plutus-core accept arbitrary terms, so we will use the more verbose constructor functions 
		let res = new IR("__core__mkNilData(())");

		// starting from last element, keeping prepending a data version of that item

		for (let i = this.#itemExprs.length - 1; i >= 0; i--) {
			let itemIR = this.#itemExprs[i].toIR(indent);

			if (isBool) {
				itemIR = new IR([
					new IR("__helios__common__boolData("),
					itemIR,
					new IR(")"),
				]);
			}

			res = new IR([
				new IR("__core__mkCons("),
				itemIR,
				new IR(", "),
				res,
				new IR(")")
			]);
		}

		return new IR([new IR("__core__listData", this.site), new IR("("), res, new IR(")")]);
	}
}

/**
 * Map[...]...{... : ...} expression
 */
 class MapLiteralExpr extends ValueExpr {
	#keyTypeExpr;
	#valueTypeExpr;
	#pairExprs;

	/**
	 * @param {Site} site 
	 * @param {TypeExpr} keyTypeExpr 
	 * @param {TypeExpr} valueTypeExpr
	 * @param {[ValueExpr, ValueExpr][]} pairExprs 
	 */
	constructor(site, keyTypeExpr, valueTypeExpr, pairExprs) {
		super(site);
		this.#keyTypeExpr = keyTypeExpr;
		this.#valueTypeExpr = valueTypeExpr;
		this.#pairExprs = pairExprs;
	}

	isLiteral() {
		return true;
	}

	toString() {
		return `Map[${this.#keyTypeExpr.toString()}]${this.#valueTypeExpr.toString()}{${this.#pairExprs.map(([keyExpr, valueExpr]) => `${keyExpr.toString()}: ${valueExpr.toString()}`).join(', ')}}`;
	}

	/**
	 * @param {Scope} scope
	 */
	evalInternal(scope) {
		let keyType = this.#keyTypeExpr.eval(scope);
		let valueType = this.#valueTypeExpr.eval(scope);

		if (keyType instanceof FuncType) {
			throw this.#keyTypeExpr.typeError("key-type of Map can't be func");
		} else if (valueType instanceof FuncType) {
			throw this.#valueTypeExpr.typeError("value-type of Map can't be func");
		}

		for (let [keyExpr, valueExpr] of this.#pairExprs) {
			let keyVal = keyExpr.eval(scope);
			let valueVal = valueExpr.eval(scope);

			if (!keyVal.isInstanceOf(keyExpr.site, keyType)) {
				throw keyExpr.typeError(`expected ${keyType.toString()} for map key, got ${keyVal.toString()}`);
			} else if (!valueVal.isInstanceOf(valueExpr.site, valueType)) {
				throw valueExpr.typeError(`expected ${valueType.toString()} for map value, got ${valueVal.toString()}`);
			}
		}

		return Value.new(new MapType(keyType, valueType));
	}

	/**
	 * @param {string} indent 
	 * @returns {IR}
	 */
	toIR(indent = "") {
		let isBoolValue = this.#valueTypeExpr.type instanceof BoolType;

		// unsure if list literals in untyped plutus-core accept arbitrary terms, so we will use the more verbose constructor functions 
		let res = new IR("__core__mkNilPairData(())");

		// starting from last element, keeping prepending a data version of that item

		for (let i = this.#pairExprs.length - 1; i >= 0; i--) {
			let [keyExpr, valueExpr] = this.#pairExprs[i];

			let valueIR = valueExpr.toIR(indent);

			if (isBoolValue) {
				valueIR = new IR([
					new IR("__helios__common__boolData("),
					valueIR,
					new IR(")"),
				]);
			}

			res = new IR([
				new IR("__core__mkCons("),
				new IR("__core__mkPairData("),
				keyExpr.toIR(indent),
				new IR(","),
				valueIR,
				new IR(")"),
				new IR(", "),
				res,
				new IR(")")
			]);
		}

		return new IR([new IR("__core__mapData", this.site), new IR("("), res, new IR(")")]);
	}
}

/**
 * NameTypePair is base class of FuncArg and DataField (differs from StructLiteralField) 
 */
class NameTypePair {
	#name;
	#typeExpr;

	/**
	 * @param {Word} name 
	 * @param {?TypeExpr} typeExpr 
	 */
	constructor(name, typeExpr) {
		this.#name = name;
		this.#typeExpr = typeExpr;
	}

	get site() {
		return this.#name.site;
	}

	get name() {
		return this.#name;
	}

	/**
	 * Throws an error if called before evalType()
	 */
	get type() {
		if (this.#typeExpr === null) {
			throw new Error("typeExpr not set");
		} else {
			return this.#typeExpr.type;
		}
	}

	toString() {
		if (this.#typeExpr === null) {
			return this.name.toString();
		} else {
			return `${this.name.toString()}: ${this.#typeExpr.toString()}`;
		}
	}

	/**
	 * Evaluates the type, used by FuncLiteralExpr and DataDefinition
	 * @param {Scope} scope 
	 * @returns {Type}
	 */
	evalType(scope) {
		if (this.#typeExpr === null) {
			throw new Error("typeExpr not set");
		} else {
			return this.#typeExpr.eval(scope);
		}
	}

	toIR() {
		return new IR(this.#name.toString(), this.#name.site);
	}
}

/**
 * Function argument class
 */
class FuncArg extends NameTypePair {
	/**
	 * @param {Word} name 
	 * @param {?TypeExpr} typeExpr 
	 */
	constructor(name, typeExpr) {
		super(name, typeExpr);
	}
}

/**
 * (..) -> RetTypeExpr {...} expression
 */
class FuncLiteralExpr extends ValueExpr {
	#args;
	#retTypeExpr;
	#bodyExpr;

	/**
	 * @param {Site} site 
	 * @param {FuncArg[]} args 
	 * @param {TypeExpr} retTypeExpr 
	 * @param {ValueExpr} bodyExpr 
	 */
	constructor(site, args, retTypeExpr, bodyExpr) {
		super(site);
		this.#args = args;
		this.#retTypeExpr = retTypeExpr;
		this.#bodyExpr = bodyExpr;
	}

	get argTypes() {
		return this.#args.map(a => a.type);
	}

	get retType() {
		return this.#retTypeExpr.type;
	}

	isLiteral() {
		return true;
	}

	toString() {
		return `(${this.#args.map(a => a.toString()).join(", ")}) -> ${this.#retTypeExpr.toString()} {${this.#bodyExpr.toString()}}`;
	}

	/**
	 * @param {Scope} scope 
	 * @returns 
	 */
	evalType(scope) {
		let args = this.#args;
		if (this.isMethod()) {
			args = args.slice(1);
		}

		let argTypes = args.map(a => a.evalType(scope));
		let retType = this.#retTypeExpr.eval(scope);

		return new FuncType(argTypes, retType);
	}

	/**
	 * @param {Scope} scope 
	 * @returns {FuncValue}
	 */
	evalInternal(scope) {
		let fnType = this.evalType(scope);
		
		// argTypes is calculated separately again here so it includes self
		let argTypes = this.#args.map(a => a.evalType(scope));

		let res = new FuncValue(fnType);

		let subScope = new Scope(scope);
		argTypes.forEach((a, i) => {
			subScope.set(this.#args[i].name, Value.new(a));
		});

		let bodyVal = this.#bodyExpr.eval(subScope);

		if (!bodyVal.isInstanceOf(this.#retTypeExpr.site, fnType.retType)) {
			throw this.#retTypeExpr.typeError(`wrong return type, expected ${fnType.retType.toString()} but got ${this.#bodyExpr.type.toString()}`);
		}

		subScope.assertAllUsed();

		return res;
	}

	isMethod() {
		return this.#args.length > 0 && this.#args[0].name.toString() == "self";
	}

	/**
	 * @returns {IR}
	 */
	argsToIR() {
		let args = this.#args.map(a => a.toIR());
		if (this.isMethod()) {
			args = args.slice(1);
		}

		return (new IR(args)).join(", ");
	}

	/**
	 * @param {?string} recursiveName 
	 * @param {string} indent 
	 * @returns {IR}
	 */
	toIRInternal(recursiveName, indent = "") {
		let argsWithCommas = this.argsToIR();

		let innerIndent = indent;
		let methodIndent = indent;
		if (this.isMethod()) {
			innerIndent += TAB;
		}

		if (recursiveName !== null) {
			innerIndent += TAB;
			methodIndent += TAB;
		}

		

		let ir = new IR([
			new IR("("),
			argsWithCommas,
			new IR(") "), new IR("->", this.site), new IR(` {\n${innerIndent}${TAB}`),
			this.#bodyExpr.toIR(innerIndent + TAB),
			new IR(`\n${innerIndent}}`),
		]);

		// wrap with 'self'
		if (this.isMethod()) {
			ir = new IR([
				new IR(`(self) -> {\n${methodIndent}${TAB}`),
				ir,
				new IR(`\n${methodIndent}}`),
			]);
		}

		if (recursiveName !== null) {
			ir = new IR([
				new IR("("),
				new IR(recursiveName),
				new IR(`) -> {\n${indent}${TAB}`),
				ir,
				new IR(`\n${indent}}`)
			]);
		}

		return ir;
	}

	/**
	 * @param {string} recursiveName 
	 * @param {string} indent 
	 * @returns {IR}
	 */
	toIRRecursive(recursiveName, indent = "") {
		return this.toIRInternal(recursiveName, indent);
	}

	/**
	 * @param {string} indent 
	 * @returns {IR}
	 */
	toIR(indent = "") {
		return this.toIRInternal(null, indent);
	}
}

/**
 * Variable expression
 */
class ValueRefExpr extends ValueExpr {
	#name;
	#isRecursiveFunc;

	/**
	 * @param {Word} name 
	 */
	constructor(name) {
		super(name.site);
		this.#name = name;
		this.#isRecursiveFunc = false;
	}

	toString() {
		return this.#name.toString();
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Value}
	 */
	evalInternal(scope) {
		let val = scope.get(this.#name);

		if (val instanceof FuncValue && val.isRecursive(scope)) {
			this.#isRecursiveFunc = true;
		}

		return val.assertValue(this.#name.site);
	}

	/**
	 * @param {string} indent 
	 * @returns {IR}
	 */
	toIR(indent = "") {
		let ir = new IR(this.toString(), this.site);

		if (this.#isRecursiveFunc) {
			ir = new IR([
				ir,
				new IR("("),
				ir,
				new IR(")")
			]);
		}
		
		return ir;
	}
}

/**
 * Word::Word::... expression
 */
class ValuePathExpr extends ValueExpr {
	#baseTypeExpr;
	#memberName;
	#isRecursiveFunc;

	/**
	 * @param {TypeExpr} baseTypeExpr 
	 * @param {Word} memberName 
	 */
	constructor(baseTypeExpr, memberName) {
		super(memberName.site);
		this.#baseTypeExpr = baseTypeExpr;
		this.#memberName = memberName;
		this.#isRecursiveFunc = false;
	}

	toString() {
		return `${this.#baseTypeExpr.toString()}::${this.#memberName.toString()}`;
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Value}
	 */
	evalInternal(scope) {
		let baseType = this.#baseTypeExpr.eval(scope);
		assert(baseType.isType());

		let memberVal = baseType.getTypeMember(this.#memberName);

		if (memberVal instanceof FuncValue && memberVal.isRecursive(scope)) {
			this.#isRecursiveFunc = true;
		}

		return memberVal.assertValue(this.#memberName.site);
	}

	/**
	 * @param {string} indent
	 * @returns {IR}
	 */
	toIR(indent = "") {
		// if we are directly accessing an enum member as a zero-field constructor we must change the code a bit
		let memberVal = this.#baseTypeExpr.type.getTypeMember(this.#memberName);

		if (((memberVal instanceof StatementType) && (memberVal.statement instanceof EnumMember)) || (memberVal instanceof OptionNoneType)) {
			let cId = memberVal.getConstrIndex(this.#memberName.site);

			return new IR(`__core__constrData(${cId.toString()}, __core__mkNilData(()))`, this.site)
		} else {
			let ir = new IR(`${this.#baseTypeExpr.type.path}__${this.#memberName.toString()}`, this.site);

			if (this.#isRecursiveFunc) {
				ir = new IR([
					ir,
					new IR("("),
					ir,
					new IR(")")
				]);
			}

			return ir;
		}
	}
}

/**
 * Unary operator expression
 * Note: there are no post-unary operators, only pre
 */
class UnaryExpr extends ValueExpr {
	#op;
	#a;

	/**
	 * @param {Symbol} op 
	 * @param {ValueExpr} a 
	 */
	constructor(op, a) {
		super(op.site);
		this.#op = op;
		this.#a = a;
	}

	toString() {
		return `${this.#op.toString()}${this.#a.toString()}`;
	}

	/**
	 * Turns an op symbol into an internal name
	 * @returns {Word}
	 */
	translateOp() {
		let op = this.#op.toString();
		let site = this.#op.site;

		if (op == "+") {
			return new Word(site, "__pos");
		} else if (op == "-") {
			return new Word(site, "__neg");
		} else if (op == "!") {
			return new Word(site, "__not");
		} else {
			throw new Error("unhandled unary op");
		}
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Value}
	 */
	evalInternal(scope) {
		let a = this.#a.eval(scope);

		this.fnVal_ = a.assertValue(this.#a.site).getInstanceMember(this.translateOp());

		// ops are immediately applied
		return this.fnVal_.call(this.#op.site, []);
	}

	/**
	 * @param {string} indent 
	 * @returns {IR}
	 */
	toIR(indent = "") {
		let path = this.type.path;

		return new IR([
			new IR(`${path}__${this.translateOp().value}`, this.site), new IR("("),
			this.#a.toIR(indent),
			new IR(")()")
		]);
	}
}

/**
 * Binary operator expression
 */
class BinaryExpr extends ValueExpr {
	#op;
	#a;
	#b;

	/**
	 * @param {Symbol} op 
	 * @param {ValueExpr} a 
	 * @param {ValueExpr} b 
	 */
	constructor(op, a, b) {
		super(op.site);
		this.#op = op;
		this.#a = a;
		this.#b = b;
	}

	toString() {
		return `${this.#a.toString()} ${this.#op.toString()} ${this.#b.toString()}`;
	}

	/**
	 * Turns op symbol into internal name
	 * @returns {Word}
	 */
	translateOp() {
		let op = this.#op.toString();
		let site = this.#op.site;
		let name;

		if (op == "||") {
			name = "__or";
		} else if (op == "&&") {
			name = "__and";
		} else if (op == "==") {
			name = "__eq";
		} else if (op == "!=") {
			name = "__neq";
		} else if (op == "<") {
			name = "__lt";
		} else if (op == "<=") {
			name = "__leq";
		} else if (op == ">") {
			name = "__gt";
		} else if (op == ">=") {
			name = "__geq";
		} else if (op == "+") {
			name = "__add";
		} else if (op == "-") {
			name = "__sub";
		} else if (op == "*") {
			name = "__mul";
		} else if (op == "/") {
			name = "__div";
		} else if (op == "%") {
			name = "__mod";
		} else {
			throw new Error("unhandled");
		}

		return new Word(site, name);
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Value}
	 */
	evalInternal(scope) {
		let a = this.#a.eval(scope);
		let b = this.#b.eval(scope);

		assert(a.isValue() && b.isValue());

		let fnVal = a.getInstanceMember(this.translateOp());

		return fnVal.call(this.#op.site, [b]);
	}

	/**
	 * @param {string} indent 
	 * @returns {IR}
	 */
	toIR(indent = "") {
		let path = this.#a.type.path;

		let op = this.translateOp().value;

		if (op == "__and" || op == "__or") {
			return new IR([
				new IR(`${path}${op}`, this.site), new IR(`(\n${indent}${TAB}() -> {`),
				this.#a.toIR(indent + TAB),
				new IR(`},\n${indent}${TAB}() -> {`),
				this.#b.toIR(indent + TAB),
				new IR(`}\n${indent})`)
			]);
		} else {
			return new IR([
				new IR(`${path}__${this.translateOp().value}`, this.site), new IR("("),
				this.#a.toIR(indent),
				new IR(")("),
				this.#b.toIR(indent),
				new IR(")")
			]);
		}
	}
}

/**
 * Parentheses expression
 */
class ParensExpr extends ValueExpr {
	#expr;

	/**
	 * @param {Site} site 
	 * @param {ValueExpr} expr 
	 */
	constructor(site, expr) {
		super(site);
		this.#expr = expr;
	}

	toString() {
		return `(${this.#expr.toString()})`;
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Value}
	 */
	evalInternal(scope) {
		return this.#expr.eval(scope);
	}

	/**
	 * @param {string} indent 
	 * @returns {IR}
	 */
	toIR(indent = "") {
		return this.#expr.toIR(indent);
	}
}

/**
 * ...(...) expression
 */
class CallExpr extends ValueExpr {
	#fnExpr;
	#argExprs;

	/**
	 * @param {Site} site 
	 * @param {ValueExpr} fnExpr 
	 * @param {ValueExpr[]} argExprs 
	 */
	constructor(site, fnExpr, argExprs) {
		super(site);
		this.#fnExpr = fnExpr;
		this.#argExprs = argExprs;
	}

	toString() {
		return `${this.#fnExpr.toString()}(${this.#argExprs.map(a => a.toString()).join(", ")})`;
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Value}
	 */
	evalInternal(scope) {
		let fnVal = this.#fnExpr.eval(scope);

		let argVals = this.#argExprs.map(argExpr => argExpr.eval(scope));

		return fnVal.call(this.site, argVals);
	}

	/**
	 * @param {string} indent 
	 * @returns {IR}
	 */
	toIR(indent = "") {
		let args = this.#argExprs.map(a => a.toIR(indent));

		return new IR([
			this.#fnExpr.toIR(indent),
			new IR("("),
			(new IR(args)).join(", "),
			new IR(")", this.site)
		]);
	}
}

/**
 *  ... . ... expression
 */
class MemberExpr extends ValueExpr {
	#objExpr;
	#memberName;
	#isRecursiveFunc;

	/**
	 * @param {Site} site 
	 * @param {ValueExpr} objExpr 
	 * @param {*} memberName 
	 */
	constructor(site, objExpr, memberName) {
		super(site);
		this.#objExpr = objExpr;
		this.#memberName = memberName;
		this.#isRecursiveFunc = false;
	}

	toString() {
		return `${this.#objExpr.toString()}.${this.#memberName.toString()}`;
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Value}
	 */
	evalInternal(scope) {
		let objVal = this.#objExpr.eval(scope);

		let memberVal = objVal.assertValue(this.#objExpr.site).getInstanceMember(this.#memberName);

		if (memberVal instanceof FuncValue && memberVal.isRecursive(scope)) {
			this.#isRecursiveFunc = true;
		}

		return memberVal;
	}

	/**
	 * @param {string} indent 
	 * @returns {IR}
	 */
	toIR(indent = "") {
		// members can be functions so, field getters are also encoded as functions for consistency

		let objPath = this.#objExpr.type.path;

		// if we are getting the member of an enum member we should check if it a field or method, because for a method we have to use the parent type
		if ((this.#objExpr.type instanceof StatementType) && (this.#objExpr.type.statement instanceof EnumMember) && (!this.#objExpr.type.statement.hasField(this.#memberName))) {
			objPath = this.#objExpr.type.statement.parent.path;
		} 

		let ir = new IR(`${objPath}__${this.#memberName.toString()}`, this.site);

		if (this.#isRecursiveFunc) {
			ir = new IR([
				ir,
				new IR("("),
				ir,
				new IR(")"),
			]);
		}

		return new IR([
			ir, new IR("("),
			this.#objExpr.toIR(indent),
			new IR(")"),
		]);
	}
}

/**
 * if-then-else expression 
 */
class IfElseExpr extends ValueExpr {
	#conditions;
	#branches;

	/**
	 * @param {Site} site 
	 * @param {ValueExpr[]} conditions 
	 * @param {ValueExpr[]} branches 
	 */
	constructor(site, conditions, branches) {
		assert(branches.length == conditions.length + 1);
		assert(branches.length > 1);

		super(site);
		this.#conditions = conditions;
		this.#branches = branches;
	}

	toString() {
		let s = "";
		for (let i = 0; i < this.#conditions.length; i++) {
			s += `if (${this.#conditions[i].toString()}) {${this.#branches[i].toString()}} else `;
		}

		s += `{${this.#branches[this.#conditions.length].toString()}}`;

		return s;
	}

	/**
	 * @param {Site} site
	 * @param {?Type} prevType
	 * @param {Type} newType
	 */
	static reduceBranchType(site, prevType, newType) {
		if (prevType === null) {
			return newType;
		} else if (!prevType.isBaseOf(site, newType)) {
			if (newType.isBaseOf(site, prevType)) {
				return newType;
			} else {
				// check if enumparent is base of newType and of prevType
				if (newType instanceof StatementType && newType.statement instanceof EnumMember) {
					let parentType = newType.statement.type;

					if (parentType.isBaseOf(site, prevType) && parentType.isBaseOf(site, newType)) {
						return parentType;
					}
				} else if (newType instanceof BuiltinEnumMember) {
					let parentType = newType.parentType;

					if (parentType.isBaseOf(site, prevType) && parentType.isBaseOf(site, newType)) {
						return parentType;
					}
				}

				throw site.typeError("inconsistent types");
			}
		} else {
			return prevType;
		}
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Value}
	 */
	evalInternal(scope) {
		for (let c of this.#conditions) {
			let cVal = c.eval(scope);
			if (!cVal.isInstanceOf(c.site, BoolType)) {
				throw c.typeError("expected bool");
			}
		}

		/**
		 * @type {?Type}
		 */
		let branchType = null;
		for (let b of this.#branches) {
			let branchVal = b.eval(scope);

			branchType = IfElseExpr.reduceBranchType(b.site, branchType, branchVal.getType(b.site));
		}

		if (branchType === null) {
			throw new Error("unexpected");
		} else {
			return Value.new(branchType);
		}
	}

	/**
	 * @param {string} indent 
	 * @returns {IR}
	 */
	toIR(indent = "") {
		let n = this.#conditions.length;

		// each branch actually returns a function to allow deferred evaluation
		let res = new IR([
			new IR("() -> {"),
			this.#branches[n].toIR(indent),
			new IR("}")
		]);

		// TODO: nice indentation
		for (let i = n - 1; i >= 0; i--) {
			res = new IR([
				new IR("__core__ifThenElse("),
				this.#conditions[i].toIR(indent),
				new IR(", () -> {"),
				this.#branches[i].toIR(indent),
				new IR("}, () -> {"),
				res,
				new IR("()})"),
			]);
		}

		return new IR([res, new IR("()", this.site)]);
	}
}

/**
 * Switch case for a switch expression
 */
class SwitchCase extends Token {
	#varName;
	#memberName;
	#bodyExpr;

	/** @type {?number} */
	#constrIndex;

	/**
	 * @param {Site} site 
	 * @param {?Word} varName - optional
	 * @param {Word} memberName - not optional
	 * @param {ValueExpr} bodyExpr 
	 */
	constructor(site, varName, memberName, bodyExpr) {
		super(site);
		this.#varName = varName;
		this.#memberName = memberName;
		this.#bodyExpr = bodyExpr;
		this.#constrIndex = null;
	}

	/**
	 * Returns typeExpr.
	 * Used by parser to check if typeExpr reference the same base enum
	 */
	get memberName() {
		return this.#memberName;
	}

	get constrIndex() {
		if (this.#constrIndex === null) {
			throw new Error("constrIndex not yet set");
		} else {
			return this.#constrIndex;
		}
	}

	toString() {
		if (this.#varName === null) {
			return `${this.#memberName.toString()} => ${this.#bodyExpr.toString()}`
		} else {
			return `(${this.#varName.toString()}: ${this.#memberName.toString()}) => ${this.#bodyExpr.toString()}`;
		}
	}

	/**
	 * Evaluates the switch type and body value of a case.
	 * Evaluated switch type is only used if #varName !== null
	 * @param {Scope} scope 
	 * @param {Type} enumType
	 * @returns {Value}
	 */
	eval(scope, enumType) {
		let caseType = enumType.getTypeMember(this.#memberName).assertType(this.#memberName.site);
		this.#constrIndex = caseType.getConstrIndex(this.#memberName.site);

		if (this.#varName !== null) {
			let caseScope = new Scope(scope);

			caseScope.set(this.#varName, Value.new(caseType));

			let bodyVal = this.#bodyExpr.eval(caseScope);

			caseScope.assertAllUsed();

			return bodyVal;
		} else {
			return this.#bodyExpr.eval(scope);
		}
	}

	/**
	 * @param {string} indent 
	 * @returns {IR}
	 */
	toIR(indent = "") {
		return new IR([
			new IR(`(${this.#varName !== null ? this.#varName.toString() : "_"}) `), new IR("->", this.site), new IR(` {\n${indent}${TAB}`),
			this.#bodyExpr.toIR(indent + TAB),
			new IR(`\n${indent}}`),
		]);
	}
}

/**
 * Default switch case
 */
class SwitchDefault extends Token {
	#bodyExpr;

	/**
	 * @param {Site} site
	 * @param {ValueExpr} bodyExpr
	 */
	constructor(site, bodyExpr) {
		super(site);
		this.#bodyExpr = bodyExpr;
	}

	toString() {
		return `else => ${this.#bodyExpr.toString()}`;
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Value}
	 */
	eval(scope) {
		return this.#bodyExpr.eval(scope);
	}

	/**
	 * @param {string} indent 
	 * @returns {IR}
	 */
	toIR(indent = "") {
		return new IR([
			new IR(`(_) `), new IR("->", this.site), new IR(` {\n${indent}${TAB}`),
			this.#bodyExpr.toIR(indent + TAB),
			new IR(`\n${indent}}`)
		]);
	}
}

/**
 * Switch expression, with SwitchCases and SwitchDefault as children
 */
class SwitchExpr extends ValueExpr {
	#controlExpr;
	#cases;
	#default;

	/** 
	 * @param {Site} site
	 * @param {ValueExpr} controlExpr - input value of the switch
	 * @param {SwitchCase[]} cases
	 * @param {?SwitchDefault} defaultCase
	*/
	constructor(site, controlExpr, cases, defaultCase = null) {
		super(site);
		this.#controlExpr = controlExpr;
		this.#cases = cases;
		this.#default = defaultCase;
	}

	toString() {
		return `${this.#controlExpr.toString()}.switch{${this.#cases.map(c => c.toString()).join(", ")}${this.#default === null ? "" : ", " + this.#default.toString()}}`;
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Value}
	 */
	evalInternal(scope) {
		let controlVal = this.#controlExpr.eval(scope);
		let enumType = controlVal.getType(this.#controlExpr.site);
		let nEnumMembers = enumType.nEnumMembers(this.#controlExpr.site);

		// check that we have enough cases to cover the enum members
		if (this.#default === null && nEnumMembers > this.#cases.length) {
			throw this.typeError(`insufficient coverage of '${enumType.toString()}' in switch expression`);
		}

		/** @type {?Type} */
		let branchType = null;

		for (let c of this.#cases) {
			let branchVal = c.eval(scope, enumType);

			branchType = IfElseExpr.reduceBranchType(c.site, branchType, branchVal.getType(c.site));
		}

		if (this.#default !== null) {
			let defaultVal = this.#default.eval(scope);

			branchType = IfElseExpr.reduceBranchType(this.#default.site, branchType, defaultVal.getType(this.#default.site));
		} else {
			if (enumType.nEnumMembers(this.site) > this.#cases.length) {
				throw this.typeError("insufficient coverage in switch expression");
			}
		}

		if (branchType === null) {
			throw new Error("unexpected");
		} else {
			return Value.new(branchType);
		}
	}

	/**
	 * @param {string} indent 
	 * @returns {IR}
	 */
	toIR(indent = "") {
		let cases = this.#cases.slice();

		/** @type {SwitchCase | SwitchDefault} */
		let last;
		if (this.#default !== null) {
			last = this.#default;
		} else {
			last = assertDefined(cases.pop());
		}

		let n = cases.length;

		let res = last.toIR(indent + TAB + TAB + TAB);

		for (let i = n - 1; i >= 0; i--) {
			res = new IR([
				new IR(`__core__ifThenElse(__core__equalsInteger(i, ${cases[i].constrIndex.toString()}), () -> {`),
				cases[i].toIR(indent + TAB + TAB + TAB),
				new IR(`}, () -> {`),
				res,
				new IR(`})()`)
			]);
		}

		return new IR([
			new IR(`(e) `), new IR("->", this.site), new IR(` {\n${indent}${TAB}(\n${indent}${TAB}${TAB}(i) -> {\n${indent}${TAB}${TAB}${TAB}`),
			res,
			new IR(`\n${indent}${TAB}${TAB}}(__core__fstPair(__core__unConstrData(e)))\n${indent}${TAB})(e)\n${indent}}(`),
			this.#controlExpr.toIR(indent),
			new IR(")"),
		]);
	}
}


////////////////////////////////////
// Section 11: AST statement objects
////////////////////////////////////

/**
 * Base class for all statements
 * Doesn't return a value upon calling eval(scope)
 */
class Statement extends Token {
	#name;

	/**
	 * @param {Site} site 
	 * @param {Word} name 
	 */
	constructor(site, name) {
		super(site);
		this.#name = name;
	}

	get name() {
		return this.#name;
	}

	/**
	 * @param {TopScope} scope 
	 */
	 eval(scope) {
		throw new Error("not yet implemented");
	}

	assertAllMembersUsed() {
	}

	/**
	 * Returns IR of statement.
	 * No need to specify indent here, because all statements are top-level
	 * @param {IRDefinitions} map 
	 */
	toIR(map) {
		throw new Error("not yet implemented");
	}
}

/**
 * Const value statement
 */
class ConstStatement extends Statement {
	#typeExpr;
	#valueExpr;

	/**
	 * @param {Site} site 
	 * @param {Word} name 
	 * @param {?TypeExpr} typeExpr - can be null in case of type inference
	 * @param {ValueExpr} valueExpr 
	 */
	constructor(site, name, typeExpr, valueExpr) {
		super(site, name);
		this.#typeExpr = typeExpr;
		this.#valueExpr = valueExpr;
	}

	get type() {
		if (this.#typeExpr === null) {
			return this.#valueExpr.type;
		} else {
			return this.#typeExpr.type;
		}
	}



	/**
	 * @param {string | PlutusCoreValue} value 
	 */
	changeValue(value) {
		let type = this.type;
		let site = this.#valueExpr.site;

		if (typeof value == "string") {
			this.#valueExpr = buildLiteralExprFromJSON(site, type, JSON.parse(value), this.name.value);
		} else {
			this.#valueExpr = buildLiteralExprFromValue(site, type, value, this.name.value);
		}
	}

	toString() {
		return `const ${this.name.toString()}${this.#typeExpr === null ? "" : ": " + this.#typeExpr.toString()} = ${this.#valueExpr.toString()};`;
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Value}
	 */
	evalInternal(scope) {
		let value = this.#valueExpr.eval(scope);

		/** @type {Type} */
		let type;

		if (this.#typeExpr === null) {
			if (!this.#valueExpr.isLiteral()) {
				throw this.typeError("can't infer type");
			}

			type = this.#valueExpr.type;
		} else {
			type = this.#typeExpr.eval(scope);

			if (!value.isInstanceOf(this.#valueExpr.site, type)) {
				throw this.#valueExpr.typeError("wrong type");
			}
		}

		return Value.new(type);
	}

	/**
	 * Evaluates rhs and adds to scope
	 * @param {TopScope} scope 
	 */
	eval(scope) {
		scope.set(this.name, this.evalInternal(scope));
	}

	/**
	 * @returns {IR}
	 */
	toIRInternal() {
		return this.#valueExpr.toIR();
	}

	/**
	 * @param {IRDefinitions} map 
	 */
	toIR(map) {
		map.set(this.name.toString(), this.toIRInternal());
	}
}

/**
 * Single field in struct or enum member
 */
class DataField extends NameTypePair {
	/**
	 * @param {Word} name 
	 * @param {TypeExpr} typeExpr 
	 */
	constructor(name, typeExpr) {
		super(name, typeExpr);
	}
}

/**
 * Base class for struct and enum member
 */
class DataDefinition extends Statement {
	#fields;

	/** @type {Set<string>} - all fields must be used */
	#fieldsUsed;

	/**
	 * @param {Site} site 
	 * @param {Word} name 
	 * @param {DataField[]} fields 
	 */
	constructor(site, name, fields) {
		super(site, name);
		this.#fields = fields;
		this.#fieldsUsed = new Set();
	}

	get fields() {
		return this.#fields.slice();
	}

	/**
	 * Returns index of a field.
	 * Returns -1 if not found.
	 * @param {Word} name 
	 * @returns {number}
	 */
	findField(name) {
		let found = -1;
		let i = 0;
		for (let f of this.#fields) {
			if (f.name.toString() == name.toString()) {
				found = i;
				break;
			}
			i++;
		}

		return found;
	}

	/**
	 * @param {Word} name 
	 * @returns {boolean}
	 */
	hasField(name) {
		return this.findField(name) != -1;
	}

	toString() {
		return `${this.name.toString()} {${this.#fields.map(f => f.toString()).join(", ")}}`;
	}

	/**
	 * @param {Scope} scope 
	 * @returns {Type}
	 */
	evalInternal(scope) {
		for (let f of this.#fields) {
			let fieldType = f.evalType(scope);

			if (fieldType instanceof FuncType) {
				throw f.site.typeError("field can't be function type");
			}
		}

		// the following assertion is needed for vscode typechecking
		if (this instanceof StructStatement || this instanceof EnumMember) {
			return new StatementType(this);
		} else {
			throw new Error("unhandled implementations");
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	nFields(site) {
		return this.#fields.length;
	}

	/**
	 * @param {Site} site 
	 * @param {number} i 
	 * @returns {Type}
	 */
	getFieldType(site, i) {
		return this.#fields[i].type;
	}

	/**
	 * @param {number} i
	 * @returns {string}
	 */
	getFieldName(i) {
		return this.#fields[i].name.toString();
	}
	
	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	nEnumMembers(site) {
		throw site.typeError("not an enum type");
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		if (this.hasField(name)) {
			throw name.referenceError(`'${this.name.toString()}::${name.toString()}' undefined (did you mean '${this.name.toString()}.${name.toString()}'?)`);
		} else {
			throw name.referenceError(`'${this.name.toString()}::${name.toString()}' undefined`);
		}
	}

	/**
	 * Gets insance member value.
	 * If dryRun == true usage is triggered
	 * @param {Word} name 
	 * @param {boolean} dryRun 
	 * @returns {Value}
	 */
	getInstanceMember(name, dryRun = false) {
		let i = this.findField(name);

		if (i == -1) {
			throw name.referenceError(`'${this.name.toString()}.${name.toString()}' undefined`);
		} else {
			if (!dryRun) {
				this.#fieldsUsed.add(name.toString());
			}
			return Value.new(this.#fields[i].type);
		}
	}

	assertAllMembersUsed() {
		for (let f of this.#fields) {
			if (!this.#fieldsUsed.has(f.name.toString())) {
				throw f.name.referenceError(`field '${this.name.toString()}.${f.name.toString()}' unused`);
			}
		}
	}

	get path() {
		return `__user__${this.name.toString()}`;
	}

	/**
	 * @param {IRDefinitions} map
	 */
	toIR(map) {
		// add a getter for each field
		for (let i = 0; i < this.#fields.length; i++) {
			let f = this.#fields[i];
			let key = `${this.path}__${f.name.toString()}`;
			let isBool = f.type instanceof BoolType;

			/**
			 * @type {IR}
			 */
			let getter;

			if (i < 20) {
				getter = new IR(`__helios__common__field_${i}`, f.site);

				if (isBool) {
					getter = new IR([
						new IR("(self) "), new IR("->", f.site), new IR(" {"),
						new IR(`__helios__common__unBoolData(__helios__common__field_${i}(self))`),
						new IR("}"),
					]);
				} else {
					getter = new IR(`__helios__common__field_${i}`, f.site);
				}
			} else {
				let inner = new IR("__core__sndPair(__core__unConstrData(self))");
				for (let j = 0; j < i; j++) {
					inner = new IR([new IR("__core__tailList("), inner, new IR(")")]);
				}

				inner = new IR([
					new IR("__core__headList("),
					inner,
					new IR(")"),
				]);

				if (isBool) {
					inner = new IR([new IR("__helios__common__unBoolData("), inner, new IR(")")]);
				}

				getter = new IR([
					new IR("(self) "), new IR("->", f.site), new IR(" {"),
					inner,
					new IR("}"),
				]);
			}

			map.set(key, getter)
		}
	}
}

/**
 * Struct statement
 */
class StructStatement extends DataDefinition {
	#impl;

	/**
	 * @param {Site} site 
	 * @param {Word} name 
	 * @param {DataField[]} fields 
	 * @param {ImplDefinition} impl
	 */
	constructor(site, name, fields, impl) {
		super(site, name, fields);

		this.#impl = impl;
	}

	get type() {
		return new StatementType(this);
	}

	toString() {
		return "struct " + super.toString();
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		return 0;
	}

	/**
	 * Evaluates own type and adds to scope
	 * @param {TopScope} scope 
	 */
	eval(scope) {
		scope.set(this.name, this.evalInternal(scope));

		// check the types of the member methods
		this.#impl.eval(scope);
	}

	/**
	 * @param {Word} name 
	 * @param {boolean} dryRun 
	 * @returns {Value}
	 */
	getInstanceMember(name, dryRun = false) {
		if (this.hasField(name)) {
			return super.getInstanceMember(name, dryRun);
		} else {
			return this.#impl.getInstanceMember(name, dryRun);
		}
	}

	/**
	 * @param {Word} name
	 * @param {boolean} dryRun
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name, dryRun = false) {
		// only the impl can contain potentially contain type members
		return this.#impl.getTypeMember(name, dryRun);
	}

	/**
	 * Throws error if some fields or some impl statements aren't used.
	 */
	assertAllMembersUsed() {
		super.assertAllMembersUsed();

		this.#impl.assertAllMembersUsed();
	}

	/**
	 * @param {IRDefinitions} map
	 */
	toIR(map) {
		super.toIR(map);

		this.#impl.toIR(map);
	}
}

/**
 * Function statement
 * (basically just a named FuncLiteralExpr)
 */
class FuncStatement extends Statement {
	#funcExpr;
	#recursive;

	/**
	 * @param {Site} site 
	 * @param {Word} name 
	 * @param {FuncLiteralExpr} funcExpr 
	 */
	constructor(site, name, funcExpr) {
		super(site, name);
		this.#funcExpr = funcExpr;
		this.#recursive = false;
	}

	get argTypes() {
		return this.#funcExpr.argTypes;
	}

	get retType() {
		return this.#funcExpr.retType;
	}

	toString() {
		return `func ${this.name.toString()}${this.#funcExpr.toString()}`;
	}

	/**
	 * Evaluates a function and returns a func value
	 * @param {Scope} scope 
	 * @returns {Value}
	 */
	evalInternal(scope) {
		return this.#funcExpr.evalInternal(scope);
	}

	/**
	 * Evaluates type of a funtion.
	 * Separate from evalInternal so we can use this function recursively inside evalInternal
	 * @param {Scope} scope 
	 * @returns {FuncType}
	 */
	evalType(scope) {
		return this.#funcExpr.evalType(scope);
	}

	isRecursive() {
		return this.#recursive;
	}

	/**
	 * Called in FuncStatementScope as soon as recursion is detected
	 */
	setRecursive() {
		this.#recursive = true;
	}

	/**
	 * @param {Scope} scope 
	 */
	eval(scope) {
		// add to scope before evaluating, to allow recursive calls

		let fnType = this.evalType(scope);

		let fnVal = new FuncStatementValue(fnType, this);

		scope.set(this.name, fnVal);

		void this.#funcExpr.evalInternal(new FuncStatementScope(scope, this));
	}

	/**
	 * Returns IR of function.
	 * @param {string} fullName - fullName has been prefixed with a type path for impl members
	 * @returns 
	 */
	toIRInternal(fullName = this.name.toString()) {
		if (this.#recursive) {
			return this.#funcExpr.toIRRecursive(fullName, TAB);
		} else {
			return this.#funcExpr.toIR(TAB);
		}
	}

	/**
	 * @param {IRDefinitions} map 
	 */
	toIR(map) {
		map.set(this.name.toString(), this.toIRInternal());
	}

	/**
	 * @param {Statement} s 
	 * @returns {boolean}
	 */
	static isMethod(s) {
		if (s instanceof FuncStatement) {
			return s.#funcExpr.isMethod();
		} else {
			return false;
		}
	}
}

/**
 * EnumMember defintion is similar to a struct definition
 */
class EnumMember extends DataDefinition {
	/** @type {?EnumStatement} */
	#parent;

	/** @type {?number} */
	#constrIndex;

	/**
	 * @param {Word} name
	 * @param {DataField[]} fields
 	 */
	constructor(name, fields) {
		super(name.site, name, fields);
		this.#parent = null; // registered later
		this.#constrIndex = null;
	}

	/** 
	 * @param {EnumStatement} parent
	 * @param {number} i
	*/
	registerParent(parent, i) {
		this.#parent = parent;
		this.#constrIndex = i;
	}
	
	get parent() {
		if (this.#parent === null) {
			throw new Error("parent not yet registered");
		} else {
			return this.#parent;
		}
	}

	get type() {
		return new StatementType(this);
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		if (this.#constrIndex === null) {
			throw new Error("constrIndex not set");
		} else {
			return this.#constrIndex;
		}
	}

	/**
	 * @param {Scope} scope 
	 */
	eval(scope) {
		if (this.#parent === null) {
			throw new Error("parent should've been registered");
		}

		void super.evalInternal(scope); // the internally created type isn't be added to the scope. (the parent enum type takes care of that)
	}

	/**
	 * @param {Word} name 
	 * @param {boolean} dryRun 
	 * @returns {Value}
	 */
	getInstanceMember(name, dryRun = false) {
		if (this.hasField(name)) {
			return super.getInstanceMember(name, dryRun);
		} else {
			if (this.#parent === null) {
				throw new Error("parent should've been registered");
			} else {
				return this.#parent.getInstanceMember(name, dryRun);
			}
		}
	}

	get path() {
		return `${this.parent.path}__${this.name.toString()}`;
	}
}

/**
 * Enum statement, containing at least one member
 */
class EnumStatement extends Statement {
	#members;
	#impl;

	/** @type {Set<string>} */
	#membersUsed;	

	/**
	 * @param {Site} site 
	 * @param {Word} name 
	 * @param {EnumMember[]} members 
	 * @param {ImplDefinition} impl
	 */
	constructor(site, name, members, impl) {
		super(site, name);
		this.#members = members;
		this.#impl = impl;
		this.#membersUsed = new Set();
		

		for (let i = 0; i < this.#members.length; i++) {
			this.#members[i].registerParent(this, i);
		}
	}

	get type() {
		return new StatementType(this);
	}

	/**
	 * Returns index of enum member.
	 * Returns -1 if not found
	 * @param {Word} name 
	 * @returns {number}
	 */
	// returns an index
	findEnumMember(name) {
		let found = -1;
		let i = 0;
		for (let member of this.#members) {
			if (member.name.toString() == name.toString()) {
				found = i;
				break;
			}
			i++;
		}

		return found;
	}

	/**
	 * @param {Word} name
	 * @returns {boolean}
	 */
	hasEnumMember(name) {
		return this.findEnumMember(name) != -1;
	}

	toString() {
		return `enum ${this.name.toString()} {${this.#members.map(m => m.toString()).join(", ")}}`;
	}

	/**
	 * @param {Scope} scope 
	 */
	eval(scope) {
		this.#members.forEach(m => {
			m.eval(scope);
		});

		scope.set(this.name, this.type);

		this.#impl.eval(scope);
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	nFields(site) {
		throw site.typeError("enum doesn't have fields");
	}

	/**
	 * @param {Site} site
	 * @param {number} i
	 * @returns {Type}
	 */
	getFieldType(site, i) {
		throw site.typeError("enum doesn't have fields");
	}

	/** 
	 * @param {Word} name 
	 * @param {boolean} dryRun 
	 * @returns {Value}
	 */
	getInstanceMember(name, dryRun = false) {
		if (this.hasEnumMember(name)) {
			throw name.referenceError(`'${name.toString()}' is an enum of '${this.toString}' (did you mean '${this.toString()}::${name.toString()}'?)`);
		} else {
			return this.#impl.getInstanceMember(name, dryRun);
		}
	}

	/**
	 * @param {Word} name 
	 * @param {boolean} dryRun
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name, dryRun = false) {
		let i = this.findEnumMember(name);
		if (i == -1) {
			return this.#impl.getTypeMember(name, dryRun);
		} else {
			if (!dryRun) {
				this.#membersUsed.add(name.toString());
			}

			return this.#members[i].type;
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		throw site.typeError("can't construct an enum directly (cast to a concrete type first)");
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	nEnumMembers(site) {
		return this.#members.length;
	}

	assertAllMembersUsed() {
		for (let m of this.#members) {
			if (!this.#membersUsed.has(m.name.toString())) {
				throw m.name.referenceError(`'${this.toString()}::${m.name.toString}' unused`);
			}

			m.assertAllMembersUsed();
		}

		this.#impl.assertAllMembersUsed();
	}

	get path() {
		return `__user__${this.name.toString()}`;
	}

	/**
	 * @param {IRDefinitions} map 
	 */
	toIR(map) {
		for (let member of this.#members) {
			member.toIR(map);
		}

		this.#impl.toIR(map);
	}
}

/**
 * Impl statements, which add functions and constants to registry of user types (Struct, Enum Member and Enums)
 */
class ImplDefinition {
	#selfTypeExpr;
	#statements;

	/** @type {Value[]} - filled during eval to allow same recursive behaviour as for top-level statements */
	#statementValues;

	/** @type {Set<string>} */
	#usedStatements;

	/**
	 * @param {TypeRefExpr} selfTypeExpr;
	 * @param {(FuncStatement | ConstStatement)[]} statements 
	 */
	constructor(selfTypeExpr, statements) {
		this.#selfTypeExpr = selfTypeExpr;
		this.#statements = statements;
		this.#statementValues = [];
		this.#usedStatements = new Set();
	}

	toString() {
		return `${this.#statements.map(s => s.toString()).join("\n")}`;
	}

	/**
	 * @param {Scope} scope 
	 */
	eval(scope) {
		let selfType = this.#selfTypeExpr.eval(scope);

		if (!(selfType instanceof StatementType)) {
			throw this.#selfTypeExpr.referenceError("not a user-type");
		} else {
			for (let s of this.#statements) {
				if (s instanceof FuncStatement) {
					// override eval() of FuncStatement because we don't want the function to add itself to the scope directly.
					let v = new FuncStatementValue(s.evalType(scope), s);

					this.#statementValues.push(v); // add func type to #statementValues in order to allow recursive calls (acts as a special scope)

					// eval internal doesn't add anything to scope
					void s.evalInternal(new FuncStatementScope(scope, s));
				} else {
					// eval internal doesn't add anything to scope
					this.#statementValues.push(s.evalInternal(scope));
				}
			}
		}
	}

	/**
	 * @param {Word} name
	 * @param {boolean} dryRun
	 * @returns {Value}
	 */
	getInstanceMember(name, dryRun = false) {
		switch (name.value) {
			case "serialize":
				this.#usedStatements.add(name.toString());
				return Value.new(new FuncType([], new ByteArrayType()));
			case "__eq":
			case "__neq":
				this.#usedStatements.add(name.toString());
				return Value.new(new FuncType([this.#selfTypeExpr.type], new BoolType()));
			default:
				// loop the contained statements to find one with name 'name'
				for (let i = 0; i < this.#statementValues.length; i++) {
					let s = this.#statements[i];

					if (name.toString() == s.name.toString()) {
						if (FuncStatement.isMethod(s)) {
							if (!dryRun) {
								this.#usedStatements.add(name.toString());
							}

							return this.#statementValues[i];
						} else {
							throw name.referenceError(`'${this.#selfTypeExpr.toString()}.${name.toString()}' isn't a method (did you mean '${this.#selfTypeExpr.toString()}::${name.toString()}'?)`);
						}
					}
				}

				throw name.referenceError(`'${this.#selfTypeExpr.toString()}.${name.toString()}' undefined`);
		}
	}
	
	/**
	 * @param {Word} name 
	 * @param {boolean} dryRun 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name, dryRun = false) {
		switch (name.value) {
			case "from_data":
				this.#usedStatements.add(name.toString());
				return Value.new(new FuncType([new RawDataType()], this.#selfTypeExpr.type));
			default:
				for (let i = 0; i < this.#statementValues.length; i++) {
					let s = this.#statements[i];

					if (name.toString() == s.name.toString()) {
						if (FuncStatement.isMethod(s)) {
							throw name.referenceError(`'${this.#selfTypeExpr.toString()}::${name.value}' is a method (did you mean '${this.#selfTypeExpr.toString()}.${name.toString()}'?)`)
						} else {
							if (!dryRun) {
								this.#usedStatements.add(name.toString());
							}

							return this.#statementValues[i];
						}
					}
				}

				throw name.referenceError(`'${this.#selfTypeExpr.toString()}::${name.toString()}' undefined`);
		}
	}

	/**
	 * Throws error if some statements not used
	 */
	assertAllMembersUsed() {
		for (let s of this.#statements) {
			if (!this.#usedStatements.has(s.name.toString())) {
				if (FuncStatement.isMethod(s)) {
					throw s.name.referenceError(`'${this.#selfTypeExpr.toString()}.${s.name.toString()}' unused`);
				} else {
					throw s.name.referenceError(`'${this.#selfTypeExpr.toString()}::${s.name.toString()}' unused`);
				}
			}
		}
	}

	/**
	 * Returns IR of all impl members
	 * @param {IRDefinitions} map 
	 */
	toIR(map) {
		let path = this.#selfTypeExpr.path;
		let site = this.#selfTypeExpr.site;

		if (this.#usedStatements.has("__eq")) {
			map.set(`${path}____eq`, new IR([
				new IR("(self) "), new IR("->", site), new IR(" {\n"),
				new IR(`${TAB}(other) -> {__core__equalsData(self, other)}\n`),
				new IR("}"),
			]));
		}

		if (this.#usedStatements.has("__neq")) {
			map.set(`${path}____neq`, new IR([
				new IR("(self) "), new IR("->", site), new IR(" {\n"),
				new IR(`${TAB}(other) -> {__helios__bool____not(__core__equalsData(self, other))}\n`),
				new IR("}"),
			]));
		}

		if (this.#usedStatements.has("serialize")) {
			map.set(`${path}__serialize`, new IR([
				new IR("(self) "), new IR("->", site), new IR(" {\n"),
				new IR(`${TAB}() -> {__core__serialiseData(self)}\n`),
				new IR("}"),
			]));
		}

		if (this.#usedStatements.has("from_data")) {
			map.set(`${path}__from_data`, new IR([
				new IR("(self) "), new IR("->", site), new IR(" {self}")
			]));
		}

		for (let s of this.#statements) {
			let key = `${path}__${s.name.toString()}`
			if (s instanceof FuncStatement) {
				map.set(key, s.toIRInternal(key));
			} else {
				map.set(key, s.toIRInternal());
			}
		}
	}
}

/**
 * @typedef {Map<string, IR>} IRDefinitions
 */

/**
 * Helios root object
 */
export class Program {
	#name;
	#statements;

	/**
	 * @param {Word} name
	 * @param {Statement[]} statements
	 */
	constructor(name, statements) {
		this.#name = name;
		this.#statements = statements;
	}

	/**
	 * Creates  a new program.
	 * @param {string} rawSrc 
	 * @returns {Program}
	 */
	static new(rawSrc) {
		let src = new Source(rawSrc);

		let ts = tokenize(src);

		if (ts.length == 0) {
			throw UserError.syntaxError(src, 0, "empty script");
		}

		let [purpose, name] = buildScriptPurpose(ts);

		let statements = buildProgramStatements(ts);
	
		/**
		 * @type {Program}
		 */
		let program;

		switch (purpose) {
			case ScriptPurpose.Testing:
				program = new TestingProgram(name, statements);
				break;
			case ScriptPurpose.Spending:
				program = new SpendingProgram(name, statements);
				break;
			case ScriptPurpose.Minting:
				program = new MintingProgram(name, statements);
				break
			case ScriptPurpose.Staking:
				program = new StakingProgram(name, statements);
				break;
			default:
				throw new Error("unhandled script purpose");
		}

		program.evalTypes();

		return program;
	}

	/**
	 * @type {string}
	 */
	get name() {
		return this.#name.value;
	}

	/**
	 * @type {FuncStatement}
	 */
	get main() {
		for (let s of this.#statements) {
			if (s.name.value == "main" && s instanceof FuncStatement) {	
				return s;
			}
		}

		throw new Error("should've been caught before");
	}

	/**
	 * @type {Object.<string, Type>}
	 */
	get paramTypes() {
		/**
		 * @type {Object.<string, Type>}
		 */
		let res = {};

		for (let s of this.#statements) {
			if (s instanceof ConstStatement) {
				res[s.name.value] = s.type;
			}
		}

		return res;
	}

	toString() {
		return this.#statements.map(s => s.toString()).join("\n");
	}

	/**
	 * @param {GlobalScope} globalScope 
	 */
	evalTypesInternal(globalScope) {
		let scope = new TopScope(globalScope);

		let mainFound = false;

		for (let s of this.#statements) {
			s.eval(scope);

			if (s.name.value == "main") {
				void scope.get(new Word(Site.dummy(), "main"));

				scope.assertAllUsed();

				mainFound = true;

				if (!(s instanceof FuncStatement)) {
					throw s.typeError("'main' isn't a function statement");
				}

				globalScope.allowMacros();
			}
		}

		if (!mainFound) {
			throw this.#name.referenceError("'main' not found");
		}

		for (let s of this.#statements) {
			s.assertAllMembersUsed();

			if (s.name.value == "main") {
				break;
			}
		}
	}

	evalTypes() {
		throw new Error("not yet implemeneted");
	}

	/**
	 * Change the literal value of a const statements  
	 * @param {string} name 
	 * @param {string | PlutusCoreValue} value 
	 */
	changeParam(name, value) {
		for (let s of this.#statements) {
			if (s instanceof ConstStatement && s.name.value == name) {
				s.changeValue(value);
				return;
			}
		}

		throw this.main.referenceError(`param '${name}' not found`);
	}

	/**
	 * Wraps 'inner' IR source with some definitions (used for top-level statements and for builtins)
	 * @param {IR} inner 
	 * @param {IRDefinitions} definitions - name -> definition
	 * @returns {IR}
	 */
	// map: name -> definition
	static wrapWithDefinitions(inner, definitions) {
		let keys = Array.from(definitions.keys()).reverse();

		let res = inner;
		for (let key of keys) {
			let definition = definitions.get(key);

			if (definition === undefined) {
				throw new Error("unexpected");
			} else {

				res = new IR([new IR("("), new IR(key), new IR(") -> {\n"),
					res, new IR(`\n}(\n${TAB}/*${key}*/\n${TAB}`), definition,
				new IR("\n)")]);
			}
		}

		return res;
	}


	/**
	 * @param {IR} ir
	 * @returns {IR}
	 */
	wrapEntryPoint(ir) {
		/**
		 * @type {Map<string, IR>}
		 */
		 let map = new Map();

		 for (let statement of this.#statements) {
			 statement.toIR(map);

			 if (statement.name.value == "main") {
				break;
			 }
		 }
 
		 // builtin functions are added when the IR program is built
		 // also replace all tabs with four spaces
		 return wrapWithRawFunctions(Program.wrapWithDefinitions(ir, map));
	}

	/**
	 * @returns {IR}
	 */
	toIR() {
		throw new Error("not yet implemented");
	}

	/**
	 * Doesn't use wrapEntryPoint
	 * @param {string} name 
	 * @returns {PlutusCoreValue}
	 */
	evalParam(name) {
		/**
		 * @type {Map<string, IR>}
		 */
		let map = new Map();

		for (let s of this.#statements) {
			s.toIR(map);
			if (s.name.value == name) {
				break;
			}
		}

		let ir = assertDefined(map.get(name));

		map.delete(name);

		ir = wrapWithRawFunctions(Program.wrapWithDefinitions(ir, map));

		let irProgram = IRProgram.new(ir, true);

		return new PlutusCoreDataValue(irProgram.site, irProgram.data);
	}

	/**
	 * @param {boolean} simplify 
	 * @returns {PlutusCoreProgram}
	 */
	compile(simplify = false) {
		let ir = this.toIR();

		let irProgram = IRProgram.new(ir, simplify);

		//console.log(irProgram.site.src.pretty());
		
		return irProgram.toPlutusCore();
	}
}

class RedeemerProgram extends Program {
	/**
	 * @param {Word} name 
	 * @param {Statement[]} statements 
	 */
	constructor(name, statements) {
		super(name, statements);
	}

	/**
	 * @param {GlobalScope} scope
	 */
	evalTypesInternal(scope) {
		super.evalTypesInternal(scope);

		// check the 'main' function

		let main = this.main;
		let argTypes = main.argTypes;
		let retType = main.retType;
		let haveRedeemer = false;
		let haveScriptContext = false;

		if (argTypes.length > 2) {
			throw main.typeError("too many arguments for main");
		}

		for (let arg of argTypes) {
			let t = arg.toString();

			if (t == "Redeemer") {
				if (haveRedeemer) {
					throw main.typeError(`duplicate 'Redeemer' argument`);
				} else if (haveScriptContext) {
					throw main.typeError(`'Redeemer' must come before 'ScriptContext'`);
				} else {
					haveRedeemer = true;
				}
			} else if (t == "ScriptContext") {
				if (haveScriptContext) {
					throw main.typeError(`duplicate 'ScriptContext' argument`);
				} else {
					haveScriptContext = true;
				}
			} else {
				throw main.typeError(`illegal argument type, must be 'Redeemer' or 'ScriptContext'`);
			}
		}

		if (!(retType instanceof BoolType)) {
			throw main.typeError(`illegal return type for main, expected 'Bool', got '${retType.toString()}'`);
		}
	}

	toIR() {
		/** @type {IR[]} */
		let outerArgs = [];

		/** @type {IR[]} */
		let innerArgs = [];

		for (let t of this.main.argTypes) {
			if (t.toString() == "Redeemer") {
				innerArgs.push(new IR("redeemer"));
				outerArgs.push(new IR("redeemer"));
			} else if (t.toString() == "ScriptContext") {
				innerArgs.push(new IR("ctx"));
				if (outerArgs.length == 0) {
					outerArgs.push(new IR("_"));
				}
				outerArgs.push(new IR("ctx"));
			} else {
				throw new Error("unexpected");
			}
		}

		while(outerArgs.length < 2) {
			outerArgs.push(new IR("_"));
		}

		let ir = new IR([
			new IR(`${TAB}/*entry point*/\n${TAB}(`),
			new IR(outerArgs).join(", "),
			new IR(`) -> {\n${TAB}${TAB}`),
			new IR(`__core__ifThenElse(\n${TAB}${TAB}${TAB}main(`),
			new IR(innerArgs).join(", "),
			new IR(`),\n${TAB}${TAB}${TAB}() -> {()},\n${TAB}${TAB}${TAB}() -> {__core__error("transaction rejected")}\n${TAB}${TAB})()`),
			new IR(`\n${TAB}}`),
		]);

		return this.wrapEntryPoint(ir);
	}
}

class DatumRedeemerProgram extends Program {
	/**
	 * @param {Word} name 
	 * @param {Statement[]} statements 
	 */
	constructor(name, statements) {
		super(name, statements);
	}

	/**
	 * @param {GlobalScope} scope 
	 */
	evalTypesInternal(scope) {
		super.evalTypesInternal(scope);

		// check the 'main' function

		let main = this.main;
		let argTypes = main.argTypes;
		let retType = main.retType;
		let haveDatum = false;
		let haveRedeemer = false;
		let haveScriptContext = false;

		if (argTypes.length > 3) {
			throw main.typeError("too many arguments for main");
		}

		for (let arg of argTypes) {
			let t = arg.toString();
			
			if (t == "Datum") {
				if (haveDatum) {
					throw main.typeError("duplicate 'Datum' argument");
				} else if (haveRedeemer) {
					throw main.typeError("'Datum' must come before 'Redeemer'");
				} else if (haveScriptContext) {
					throw main.typeError("'Datum' must come before 'ScriptContext'");
				} else {
					haveDatum = true;
				}
			} else if (t == "Redeemer") {
				if (haveRedeemer) {
					throw main.typeError("duplicate 'Redeemer' argument");
				} else if (haveScriptContext) {
					throw main.typeError("'Redeemer' must come before 'ScriptContext'");
				} else {
					haveRedeemer = true;
				}
			} else if (t == "ScriptContext") {
				if (haveScriptContext) {
					throw main.typeError("duplicate 'ScriptContext' argument");
				} else {
					haveScriptContext = true;
				}
			} else {
				throw main.typeError("illegal argument type, must be 'Datum', 'Redeemer' or 'ScriptContext'");
			}
		}

		if (!(retType instanceof BoolType)) {
			throw main.typeError(`illegal return type for main, expected 'Bool', got '${retType.toString()}'`);
		}
	}

	toIR() {
		/** @type {IR[]} */
		let outerArgs = [];

		/** @type {IR[]} */
		let innerArgs = [];

		for (let t of this.main.argTypes) {
			if (t.toString() == "Datum") {
				innerArgs.push(new IR("datum"));
				outerArgs.push(new IR("datum"));
			} else if (t.toString() == "Redeemer") {
				innerArgs.push(new IR("redeemer"));
				if (outerArgs.length == 0) {
					outerArgs.push(new IR("_"));
				}
				outerArgs.push(new IR("redeemer"));
			} else if (t.toString() == "ScriptContext") {
				innerArgs.push(new IR("ctx"));
				while (outerArgs.length < 2) {
					outerArgs.push(new IR("_"));
				}
				outerArgs.push(new IR("ctx"));
			} else {
				throw new Error("unexpected");
			}
		}

		while(outerArgs.length < 3) {
			outerArgs.push(new IR("_"));
		}

		let ir = new IR([
			new IR(`${TAB}/*entry point*/\n${TAB}(`),
			new IR(outerArgs).join(", "),
			new IR(`) -> {\n${TAB}${TAB}`),
			new IR(`__core__ifThenElse(\n${TAB}${TAB}${TAB}main(`),
			new IR(innerArgs).join(", "),
			new IR(`),\n${TAB}${TAB}${TAB}() -> {()},\n${TAB}${TAB}${TAB}() -> {__core__error("transaction rejected")}\n${TAB}${TAB})()`),
			new IR(`\n${TAB}}`),
		]);

		return this.wrapEntryPoint(ir);
	}
}

class TestingProgram extends Program {
	/**
	 * @param {Word} name 
	 * @param {Statement[]} statements 
	 */
	constructor(name, statements) {
		super(name, statements);
	}

	toString() {
		return `testing ${this.name}\n${super.toString()}`;
	}

	evalTypes() {
		let scope = GlobalScope.new(ScriptPurpose.Testing);

		this.evalTypesInternal(scope);

		// main can have any arg types, and any return type 
	}

	/**
	 * @returns {IR}
	 */
	toIR() {
		let args = this.main.argTypes.map((_, i) => new IR(`arg${i}`));

		let ir = new IR([
			new IR(`${TAB}/*entry point*/\n${TAB}(`),
			new IR(args).join(", "),
			new IR(`) -> {\n${TAB}${TAB}`),
			new IR([
				new IR("main("),
				new IR(args).join(", "),
				new IR(")"),
			]),
			new IR(`\n${TAB}}`),
		]);

		return this.wrapEntryPoint(ir);
	}
}

class SpendingProgram extends DatumRedeemerProgram {
	/**
	 * @param {Word} name 
	 * @param {Statement[]} statements 
	 */
	constructor(name, statements) {
		super(name, statements);
	}

	toString() {
		return `spending ${this.name}\n${super.toString()}`;
	}

	evalTypes() {
		let scope = GlobalScope.new(ScriptPurpose.Spending);

		this.evalTypesInternal(scope);	
	}
}

class MintingProgram extends RedeemerProgram {
	/**
	 * @param {Word} name 
	 * @param {Statement[]} statements 
	 */
	constructor(name, statements) {
		super(name, statements);
	}

	toString() {
		return `minting ${this.name}\n${super.toString()}`;
	}

	evalTypes() {
		let scope = GlobalScope.new(ScriptPurpose.Minting);

		this.evalTypesInternal(scope);	
	}
}

class StakingProgram extends RedeemerProgram {
	/**
	 * @param {Word} name 
	 * @param {Statement[]} statements 
	 */
	constructor(name, statements) {
		super(name, statements);
	}

	toString() {
		return `staking ${this.name}\n${super.toString()}`;
	}

	evalTypes() {
		let scope = GlobalScope.new(ScriptPurpose.Staking);

		this.evalTypesInternal(scope);	
	}
}


//////////////////////////////////
// Section 12: AST build functions
//////////////////////////////////

/**
 * @param {Token[]} ts
 * @returns {Statement[]}
 */
function buildProgramStatements(ts) {
	/**
	 * @type {Statement[]}
	 */
	let statements = [];

	while (ts.length != 0) {
		let t = assertDefined(ts.shift()).assertWord();
		let kw = t.value;
		let s;

		if (kw == "const") {
			s = buildConstStatement(t.site, ts);
		} else if (kw == "struct") {
			s = buildStructStatement(t.site, ts);
		} else if (kw == "func") {
			s = buildFuncStatement(t.site, ts);
		} else if (kw == "enum") {
			s = buildEnumStatement(t.site, ts);
		} else {
			throw t.syntaxError(`invalid top-level keyword '${kw}'`);
		}

		statements.push(s);
	}

	return statements;
}

/**
 * @param {Token[]} ts 
 * @returns {[number, Word]} - [purpose, name] (ScriptPurpose is an integer)
 */
function buildScriptPurpose(ts) {
	// need at least 2 tokens for the script purpose
	if (ts.length < 2) {
		throw ts[0].syntaxError("invalid script purpose syntax");
	}

	let purposeWord = assertDefined(ts.shift()).assertWord();
	let purpose;
	if (purposeWord.isWord("spending")) {
		purpose = ScriptPurpose.Spending;
	} else if (purposeWord.isWord("minting")) {
		purpose = ScriptPurpose.Minting;
	} else if (purposeWord.isWord("testing")) { // 'test' is not reserved as a keyword though
		purpose = ScriptPurpose.Testing;
	} else if (purposeWord.isKeyword()) {
		throw purposeWord.syntaxError(`script purpose missing`);
	} else {
		throw purposeWord.syntaxError(`unrecognized script purpose '${purposeWord.value}' (expected 'testing', 'spending' or 'minting')`);
	}

	let name = assertDefined(ts.shift()).assertWord().assertNotKeyword();

	return [purpose, name];
}

/**
 * @param {Site} site 
 * @param {Token[]} ts 
 * @returns {ConstStatement}
 */
function buildConstStatement(site, ts) {
	let name = assertDefined(ts.shift()).assertWord().assertNotKeyword();

	let typeExpr = null;
	if (ts[0].isSymbol(":")) {
		ts.shift();

		let equalsPos = Symbol.find(ts, "=");

		if (equalsPos == -1) {
			throw site.syntaxError("invalid syntax");
		}

		typeExpr = buildTypeExpr(ts.splice(0, equalsPos));
	}

	let maybeEquals = ts.shift();
	if (maybeEquals === undefined) {
		throw site.syntaxError("expected '=' after 'consts'");
	} else {
		void maybeEquals.assertSymbol("=");

		let nextStatementPos = Word.find(ts, ["const", "func", "struct", "enum"]);

		let tsValue = nextStatementPos == -1 ? ts.splice(0) : ts.splice(0, nextStatementPos);

		let valueExpr = buildValueExpr(tsValue);

		return new ConstStatement(site, name, typeExpr, valueExpr);
	}
}

/**
 * @param {Token[]} ts
 * @returns {[Token[], Token[]]}
 */
function splitDataImpl(ts) {
	let implPos = Word.find(ts, ["const", "func"]);

	if (implPos == -1) {
		return [ts, []];
	} else {
		return [ts.slice(0, implPos), ts.slice(implPos)];
	}
}

/**
 * @param {Site} site 
 * @param {Token[]} ts 
 * @returns {StructStatement}
 */
function buildStructStatement(site, ts) {
	let maybeName = ts.shift();

	if (maybeName === undefined) {
		throw site.syntaxError("expected name after 'struct'");
	} else {
		let name = maybeName.assertWord().assertNotKeyword();

		let maybeBraces = ts.shift();
		if (maybeBraces === undefined) {
			throw name.syntaxError(`expected '{...}' after 'struct ${name.toString()}'`);
		} else {
			let braces = maybeBraces.assertGroup("{", 1);

			let [tsFields, tsImpl] = splitDataImpl(braces.fields[0]);

			if (tsFields.length == 0) {
				throw braces.syntaxError("expected at least one struct field");
			}

			let fields = buildDataFields(tsFields);

			let impl = buildImplDefinition(tsImpl, new TypeRefExpr(name), fields.map(f => f.name));

			return new StructStatement(site, name, fields, impl);
		}
	}
}

/**
 * @param {Token[]} ts 
 * @returns {DataField[]}
 */
function buildDataFields(ts) {
	/** @type {DataField[]} */
	let fields = []

	/**
	 * @param {Word} fieldName
	 */
	function assertUnique(fieldName) {
		if (fields.findIndex(f => f.name.toString() == fieldName.toString()) != -1) {
			throw fieldName.typeError(`duplicate field \'${fieldName.toString()}\'`);
		}
	}

	while (ts.length > 0) {
		let colonPos = Symbol.find(ts, ":");

		if (colonPos == -1) {
			throw ts[0].syntaxError("expected ':' in data field");
		}

		let tsBef = ts.slice(0, colonPos);
		let tsAft = ts.slice(colonPos+1);
		let maybeFieldName = tsBef.shift();
		if (maybeFieldName === undefined) {
			throw ts[colonPos].syntaxError("expected word before ':'");
		} else {
			let fieldName = maybeFieldName.assertWord().assertNotKeyword();

			assertUnique(fieldName);

			if (tsAft.length == 0) {
				throw ts[colonPos].syntaxError("expected type expression after ':'");
			}

			let nextColonPos = Symbol.find(tsAft, ":");

			if (nextColonPos != -1) {
				if (nextColonPos == 0) {
					throw tsAft[nextColonPos].syntaxError("expected word before ':'");
				}

				void tsAft[nextColonPos-1].assertWord();

				ts = tsAft.splice(nextColonPos-1);
			} else {
				ts = [];
			}

			let typeExpr = buildTypeExpr(tsAft);

			fields.push(new DataField(fieldName, typeExpr));
		}
	}

	return fields;
}

/**
 * @param {Site} site 
 * @param {Token[]} ts 
 * @param {?TypeExpr} methodOf - methodOf !== null then first arg can be named 'self'
 * @returns {FuncStatement}
 */
function buildFuncStatement(site, ts, methodOf = null) {
	let name = assertDefined(ts.shift()).assertWord().assertNotKeyword();

	return new FuncStatement(site, name, buildFuncLiteralExpr(ts, methodOf));
}

/**
 * @param {Token[]} ts 
 * @param {?TypeExpr} methodOf - methodOf !== null then first arg can be named 'self'
 * @returns {FuncLiteralExpr}
 */
function buildFuncLiteralExpr(ts, methodOf = null) {
	let parens = assertDefined(ts.shift()).assertGroup("(");
	let site = parens.site;
	let args = buildFuncArgs(parens, methodOf);

	assertDefined(ts.shift()).assertSymbol("->");

	let bodyPos = Group.find(ts, "{");

	if (bodyPos == -1) {
		throw site.syntaxError("no function body");
	} else if (bodyPos == 0) {
		throw site.syntaxError("no return type specified");
	}

	let retTypeExpr = buildTypeExpr(ts.splice(0, bodyPos));
	let bodyExpr = buildValueExpr(assertDefined(ts.shift()).assertGroup("{", 1).fields[0]);

	return new FuncLiteralExpr(site, args, retTypeExpr, bodyExpr);
}

/**
 * @param {Group} parens 
 * @param {?TypeExpr} methodOf - methodOf !== nul then first arg can be named 'self'
 * @returns {FuncArg[]}
 */
function buildFuncArgs(parens, methodOf = null) {
	/** @type {FuncArg[]} */
	let args = [];

	for (let i = 0; i < parens.fields.length; i++) {
		let f = parens.fields[i];
		let ts = f.slice();

		let name = assertDefined(ts.shift()).assertWord();

		if (name.toString() == "self") {
			if (i != 0 || methodOf === null) {
				throw name.syntaxError("'self' is reserved");
			} else {
				if (ts.length > 0) {
					if (ts[0].isSymbol(":")) {
						throw ts[0].syntaxError("unexpected type expression after 'self'");
					} else {
						throw ts[0].syntaxError("unexpected token");
					}
				} else {
					args.push(new FuncArg(name, methodOf));
				}
			}
		} else {
			name = name.assertNotKeyword();

			for (let prev of args) {
				if (prev.name.toString() == name.toString()) {
					throw name.syntaxError(`duplicate argument '${name.toString()}'`);
				}
			}

			let maybeColon = ts.shift();
			if (maybeColon === undefined) {
				throw name.syntaxError(`expected ':' after '${name.toString()}'`);
			} else {
				let colon = maybeColon.assertSymbol(":");

				if (ts.length == 0) {
					throw colon.syntaxError("expected type expression after ':'");
				}

				let typeExpr = buildTypeExpr(ts);

				args.push(new FuncArg(name, typeExpr));
			}
		}
	}

	return args;
}

/**
 * @param {Site} site 
 * @param {Token[]} ts 
 * @returns {EnumStatement}
 */
function buildEnumStatement(site, ts) {
	let maybeName = ts.shift();

	if (maybeName === undefined) {
		throw site.syntaxError("expected word after 'enum'");
	} else {
		let name = maybeName.assertWord().assertNotKeyword();

		let maybeBraces = ts.shift();
		if (maybeBraces === undefined) {
			throw name.syntaxError(`expected '{...}' after 'enum ${name.toString()}'`);
		} else {
			let braces = maybeBraces.assertGroup("{", 1);

			let [tsMembers, tsImpl] = splitDataImpl(braces.fields[0]);

			if (tsMembers.length == 0) {
				throw braces.syntaxError("expected at least one enum member");
			}

			/** @type {EnumMember[]} */
			let members = [];

			while (tsMembers.length > 0) {
				members.push(buildEnumMember(tsMembers));
			}

			let impl = buildImplDefinition(tsImpl, new TypeRefExpr(name), members.map(m => m.name));

			return new EnumStatement(site, name, members, impl);
		}
	}
}

/**
 * @param {Token[]} ts 
 * @returns {EnumMember}
 */
function buildEnumMember(ts) {
	let name = assertDefined(ts.shift()).assertWord().assertNotKeyword();

	if (ts.length == 0 || ts[0].isWord()) {
		return new EnumMember(name, []);
	} else {
		let braces = assertDefined(ts.shift()).assertGroup("{", 1);

		let fields = buildDataFields(braces.fields[0]);

		return new EnumMember(name, fields);
	}
}

/** 
 * @param {Token[]} ts 
 * @param {TypeRefExpr} selfTypeExpr - reference to parent type
 * @param {Word[]} fieldNames - to check if impl statements have a unique name
 * @returns {ImplDefinition}
 */
function buildImplDefinition(ts, selfTypeExpr, fieldNames) {
	/**
	 * @param {Word} name 
	 */
	function assertNonAuto(name) {
		if (name.toString() == "serialize" || name.toString() == "__eq" || name.toString() == "__neq" || name.toString() == "from_data") {
			throw name.syntaxError(`'${name.toString()}' is a reserved member`);
		}
	}

	for (let fieldName of fieldNames) {
		assertNonAuto(fieldName);
	}

	let statements = buildImplMembers(ts, selfTypeExpr);

	/** 
	 * @param {number} i 
	 */
	function assertUnique(i) {
		let s = statements[i];

		assertNonAuto(s.name);

		for (let fieldName of fieldNames) {
			if (fieldName.toString() == s.name.toString()) {
				throw s.name.syntaxError(`'${s.name.toString()}' is duplicate`);
			}
		}

		for (let j = i+1; j < statements.length; j++) {
			if (statements[j].name.toString() == s.name.toString()) {
				throw statements[j].name.syntaxError(`'${s.name.toString()}' is duplicate`);
			}
		}
	}

	for (let i = 0; i < statements.length; i++) {
		assertUnique(i);
	}

	return new ImplDefinition(selfTypeExpr, statements);
}

/**
 * @param {Token[]} ts 
 * @param {TypeExpr} methodOf
 * @returns {(ConstStatement | FuncStatement)[]}
 */
function buildImplMembers(ts, methodOf) {
	/** @type {(ConstStatement | FuncStatement)[]} */
	let statements = [];


	while (ts.length != 0) {
		let t = assertDefined(ts.shift()).assertWord();
		let kw = t.value;
		let s;

		if (kw == "const") {
			s = buildConstStatement(t.site, ts);
		} else if (kw == "func") {
			s = buildFuncStatement(t.site, ts, methodOf);
		} else {
			throw t.syntaxError("invalid impl syntax");
		}

		statements.push(s);
	}

	return statements
}

/**
 * @param {Token[]} ts 
 * @returns {TypeExpr}
 */
function buildTypeExpr(ts) {
	assert(ts.length > 0);

	if (ts[0].isGroup("[")) {
		return buildListTypeExpr(ts);
	} else if (ts[0].isWord("Map")) {
		return buildMapTypeExpr(ts);
	} else if (ts[0].isWord("Option")) {
		return buildOptionTypeExpr(ts);
	} else if (ts.length > 1 && ts[0].isGroup("(") && ts[1].isSymbol("->")) {
		return buildFuncTypeExpr(ts);
	} else if (ts.length > 1 && ts[0].isWord() && ts[1].isSymbol("::")) {
		return buildTypePathExpr(ts);
	} else if (ts[0].isWord()) {
		return buildTypeRefExpr(ts);
	} else {
		throw ts[0].syntaxError("invalid type syntax")
	}
}

/**
 * @param {Token[]} ts 
 * @returns {ListTypeExpr}
 */
function buildListTypeExpr(ts) {
	let brackets = assertDefined(ts.shift()).assertGroup("[", 0);

	let itemTypeExpr = buildTypeExpr(ts);

	return new ListTypeExpr(brackets.site, itemTypeExpr);
}

/**
 * @param {Token[]} ts 
 * @returns {MapTypeExpr}
 */
function buildMapTypeExpr(ts) {
	let kw = assertDefined(ts.shift()).assertWord("Map");

	let keyTypeExpr = buildTypeExpr(assertDefined(ts.shift()).assertGroup("[", 1).fields[0]);

	let valueTypeExpr = buildTypeExpr(ts);

	return new MapTypeExpr(kw.site, keyTypeExpr, valueTypeExpr);
}

/**
 * @param {Token[]} ts 
 * @returns {TypeExpr}
 */
function buildOptionTypeExpr(ts) {
	let kw = assertDefined(ts.shift()).assertWord("Option");

	let someTypeExpr = buildTypeExpr(assertDefined(ts.shift()).assertGroup("[", 1).fields[0]);

	let typeExpr = new OptionTypeExpr(kw.site, someTypeExpr);
	if (ts.length > 0) {
		if (ts[0].isSymbol("::") && ts[1].isWord(["Some", "None"])) {
			if (ts.length > 2) {
				throw ts[2].syntaxError("unexpected token");
			}

			return new TypePathExpr(ts[0].site, typeExpr, ts[1].assertWord());
		} else {
			throw ts[0].syntaxError("invalid option type syntax");
		}
	} else {
		return typeExpr;
	}
}

/**
 * @param {Token[]} ts 
 * @returns {FuncTypeExpr}
 */
function buildFuncTypeExpr(ts) {
	let parens = assertDefined(ts.shift()).assertGroup("(");

	let argTypes = parens.fields.map(f => buildTypeExpr(f.slice()));

	assertDefined(ts.shift()).assertSymbol("->");

	let retType = buildTypeExpr(ts);

	return new FuncTypeExpr(parens.site, argTypes, retType);
}

/**
 * @param {Token[]} ts 
 * @returns {TypePathExpr}
 */
function buildTypePathExpr(ts) {
	let baseName = assertDefined(ts.shift()).assertWord().assertNotKeyword();

	let symbol = assertDefined(ts.shift()).assertSymbol("::");

	let memberName = assertDefined(ts.shift()).assertWord();

	if (ts.length > 0) {
		throw ts[0].syntaxError("invalid type syntax");
	}

	return new TypePathExpr(symbol.site, new TypeRefExpr(baseName), memberName);
}

/**
 * @param {Token[]} ts 
 * @returns {TypeRefExpr}
 */
function buildTypeRefExpr(ts) {
	let name = assertDefined(ts.shift()).assertWord().assertNotKeyword();

	if (ts.length > 0) {
		throw ts[0].syntaxError("invalid type syntax");
	}

	return new TypeRefExpr(name);
}

/**
 * @param {Token[]} ts 
 * @param {number} prec 
 * @returns {ValueExpr}
 */
function buildValueExpr(ts, prec = 0) {
	assert(ts.length > 0);

	// lower index in exprBuilders is lower precedence
	/** @type {((ts: Token[], prev: number) => ValueExpr)[]} */
	const exprBuilders = [
		/**
		 * 0: lowest precedence is assignment
		 * @param {Token[]} ts_ 
		 * @param {number} prec_ 
		 * @returns 
		 */
		function (ts_, prec_) {
			return buildMaybeAssignOrPrintExpr(ts_, prec_);
		},
		makeBinaryExprBuilder('||'), // 1: logical or operator
		makeBinaryExprBuilder('&&'), // 2: logical and operator
		makeBinaryExprBuilder(['==', '!=']), // 3: eq or neq
		makeBinaryExprBuilder(['<', '<=', '>', '>=']), // 4: comparison
		makeBinaryExprBuilder(['+', '-']), // 5: addition subtraction
		makeBinaryExprBuilder(['*', '/', '%']), // 6: multiplication division remainder
		makeUnaryExprBuilder(['!', '+', '-']), // 7: logical not, negate
		/**
		 * 8: variables or literal values chained with: (enum)member access, indexing and calling
		 * @param {Token[]} ts_ 
		 * @param {number} prec_ 
		 * @returns 
		 */
		function (ts_, prec_) {
			return buildChainedValueExpr(ts_, prec_);
		}
	];

	return exprBuilders[prec](ts, prec);
}

/**
 * @param {Token[]} ts
 * @param {number} prec
 * @returns {ValueExpr}
 */
function buildMaybeAssignOrPrintExpr(ts, prec) {
	let semicolonPos = Symbol.find(ts, ";");
	let equalsPos = Symbol.find(ts, "=");
	let printPos = Word.find(ts, "print");

	if (semicolonPos == -1) {
		if (equalsPos != -1) {
			throw ts[equalsPos].syntaxError("invalid assignment syntax, expected ';' after '...=...'");
		} else if (printPos != -1) {
			throw ts[printPos].syntaxError("invalid print expression, expected ';' after 'print(...)'");
		} else {
			return buildValueExpr(ts, prec + 1);
		}
	} else {
		if (equalsPos == -1 && printPos == -1) {
			throw ts[semicolonPos].syntaxError("expected '=', or 'print', before ';'");
		}

		if (equalsPos != -1 && equalsPos < semicolonPos) {
			if (printPos != -1) {
				if (printPos <= semicolonPos) {
					throw ts[printPos].syntaxError("expected ';' after 'print(...)'");
				}
			}

			let equalsSite = ts[equalsPos].assertSymbol("=").site;

			let lts = ts.splice(0, equalsPos);

			let maybeName = lts.shift();
			if (maybeName === undefined) {
				throw equalsSite.syntaxError("expected a name before '='");
			} else {
				let name = maybeName.assertWord().assertNotKeyword();

				let typeExpr = null;
				if (lts.length > 0) {
					let colon = assertDefined(lts.shift()).assertSymbol(":");

					if (lts.length == 0) {
						colon.syntaxError("expected type expression after ':'");
					} else {
						typeExpr = buildTypeExpr(lts);
					}
				}

				assertDefined(ts.shift()).assertSymbol("=");

				semicolonPos = Symbol.find(ts, ";");
				assert(semicolonPos != -1);

				let upstreamTs = ts.splice(0, semicolonPos);
				if (upstreamTs.length == 0) {
					throw equalsSite.syntaxError("expected expression between '=' and ';'");
				}

				let upstreamExpr = buildValueExpr(upstreamTs, prec + 1);

				let semicolonSite = assertDefined(ts.shift()).assertSymbol(";").site;

				if (ts.length == 0) {
					throw semicolonSite.syntaxError("expected expression after ';'");
				}

				let downstreamExpr = buildValueExpr(ts, prec);

				return new AssignExpr(equalsSite, name, typeExpr, upstreamExpr, downstreamExpr);
			}
		} else if (printPos != -1 && printPos < semicolonPos) {
			if (equalsPos != -1) {
				if (equalsPos <= semicolonPos) {
					throw ts[equalsPos].syntaxError("expected ';' after '...=...'");
				}
			}

			let printSite = assertDefined(ts.shift()).assertWord("print").site;

			let maybeParens = ts.shift();

			if (maybeParens === undefined) {
				throw ts[printPos].syntaxError("expected '(...)' after 'print'");
			} else {
				let parens = maybeParens.assertGroup("(", 1);

				let msgExpr = buildValueExpr(parens.fields[0]);

				let semicolonSite = assertDefined(ts.shift()).assertSymbol(";").site;

				if (ts.length == 0) {
					throw semicolonSite.syntaxError("expected expression after ';'");
				}

				let downstreamExpr = buildValueExpr(ts, prec);

				return new PrintExpr(printSite, msgExpr, downstreamExpr);
			}
		} else {
			throw new Error("unhandled");
		}
	}
}

/**
 * @param {string | string[]} symbol 
 * @returns {(ts: Token[], prec: number) => ValueExpr}
 */
function makeBinaryExprBuilder(symbol) {
	// default behaviour is left-to-right associative
	return function (ts, prec) {
		let iOp = Symbol.findLast(ts, symbol);

		if (iOp == ts.length - 1) {
			// post-unary operator, which is invalid
			throw ts[iOp].syntaxError(`invalid syntax, '${ts[iOp].toString()}' can't be used as a post-unary operator`);
		} else if (iOp > 0) { // iOp == 0 means maybe a (pre)unary op, which is handled by a higher precedence
			let a = buildValueExpr(ts.slice(0, iOp), prec);
			let b = buildValueExpr(ts.slice(iOp + 1), prec + 1);

			return new BinaryExpr(ts[iOp].assertSymbol(), a, b);
		} else {
			return buildValueExpr(ts, prec + 1);
		}
	};
}

/**
 * @param {string | string[]} symbol 
 * @returns {(ts: Token[], prec: number) => ValueExpr}
 */
function makeUnaryExprBuilder(symbol) {
	// default behaviour is right-to-left associative
	return function (ts, prec) {
		if (ts[0].isSymbol(symbol)) {
			let rhs = buildValueExpr(ts.slice(1), prec);

			return new UnaryExpr(ts[0].assertSymbol(), rhs);
		} else {
			return buildValueExpr(ts, prec + 1);
		}
	}
}

/**
 * @param {Token[]} ts 
 * @param {number} prec 
 * @returns {ValueExpr}
 */
function buildChainedValueExpr(ts, prec) {
	/** @type {ValueExpr} */
	let expr = buildChainStartValueExpr(ts);

	// now we can parse the rest of the chaining
	while (ts.length > 0) {
		let t = assertDefined(ts.shift());

		if (t.isGroup("(")) {
			expr = new CallExpr(t.site, expr, buildCallArgs(t.assertGroup()));
		} else if (t.isGroup("[")) {
			throw t.syntaxError("invalid expression '[...]'");
		} else if (t.isSymbol(".") && ts.length > 0 && ts[0].isWord("switch")) {
			expr = buildSwitchExpr(expr, ts);
		} else if (t.isSymbol(".")) {
			let name = assertDefined(ts.shift()).assertWord().assertNotKeyword();

			expr = new MemberExpr(t.site, expr, name);
		} else if (t.isGroup("{")) {
			throw t.syntaxError("invalid syntax");
		} else if (t.isSymbol("::")) {
			throw t.syntaxError("invalid syntax");
		} else {
			throw t.syntaxError(`invalid syntax '${t.toString()}'`);
		}
	}

	return expr;
}

/**
 * @param {Token[]} ts 
 * @returns {ValueExpr}
 */
function buildChainStartValueExpr(ts) {
	if (ts.length > 1 && ts[0].isGroup("(") && ts[1].isSymbol("->")) {
		return buildFuncLiteralExpr(ts);
	} else if (ts[0].isWord("if")) {
		return buildIfElseExpr(ts);
	} else if (ts[0].isWord("switch")) {
		throw ts[0].syntaxError("expected '... .switch' instead of 'switch'");
	} else if (ts[0].isLiteral()) {
		return new PrimitiveLiteralExpr(assertDefined(ts.shift())); // can simply be reused
	} else if (ts[0].isGroup("(")) {
		return new ParensExpr(ts[0].site, buildValueExpr(assertDefined(ts.shift()).assertGroup("(", 1).fields[0]));
	} else if (Group.find(ts, "{") != -1) {
		if (ts[0].isGroup("[")) {
			return buildListLiteralExpr(ts);
		} else if (ts[0].isWord("Map") && ts[1].isGroup("[")) {
			return buildMapLiteralExpr(ts); 
		} else {
			// could be switch or literal struct construction
			let iBraces = Group.find(ts, "{");
			let iSwitch = Word.find(ts, "switch");
			let iPeriod = Symbol.find(ts, ".");

			if (iSwitch != -1 && iPeriod != -1 && iSwitch < iBraces && iPeriod < iBraces && iSwitch > iPeriod) {
				return buildValueExpr(ts.splice(0, iPeriod));
			} else {
				return buildStructLiteralExpr(ts);
			}
		}
	} else if (Symbol.find(ts, "::") != -1) {
		return buildValuePathExpr(ts);
	} else if (ts[0].isWord()) {
		if (ts[0].isWord("const") || ts[0].isWord("struct") || ts[0].isWord("enum") || ts[0].isWord("func")) {
			throw ts[0].syntaxError(`invalid use of '${ts[0].assertWord().value}', can only be used as top-level statement`);
		} else {
			let name = assertDefined(ts.shift()).assertWord();

			// only place where a word can be "self"
			return new ValueRefExpr(name.value == "self" ? name : name.assertNotKeyword());
		}
	} else {
		throw ts[0].syntaxError("invalid syntax");
	}
}

/**
 * @param {Group} parens 
 * @returns {ValueExpr[]}
 */
function buildCallArgs(parens) {
	return parens.fields.map(fts => buildValueExpr(fts));
}

/**
 * @param {Token[]} ts 
 * @returns {IfElseExpr}
 */
function buildIfElseExpr(ts) {
	let site = assertDefined(ts.shift()).assertWord("if").site;

	let conditions = [];
	let branches = [];
	while (true) {
		let parens = assertDefined(ts.shift()).assertGroup("(");
		let braces = assertDefined(ts.shift()).assertGroup("{");

		if (parens.fields.length != 1) {
			throw parens.syntaxError("expected single if-else condition");
		}

		if (braces.fields.length != 1) {
			throw braces.syntaxError("expected single if-else branch expession");
		}

		conditions.push(buildValueExpr(parens.fields[0]));
		branches.push(buildValueExpr(braces.fields[0]));

		assertDefined(ts.shift()).assertWord("else");

		let next = assertDefined(ts.shift());
		if (next.isGroup("{")) {
			// last group
			let braces = next.assertGroup();
			if (braces.fields.length != 1) {
				throw braces.syntaxError("expected single expession for if-else branch");
			}
			branches.push(buildValueExpr(braces.fields[0]));
			break;
		} else if (next.isWord("if")) {
			continue;
		} else {
			throw next.syntaxError("unexpected token");
		}
	}

	return new IfElseExpr(site, conditions, branches);
}

/**
 * @param {ValueExpr} controlExpr
 * @param {Token[]} ts 
 * @returns {SwitchExpr}
 */
function buildSwitchExpr(controlExpr, ts) {
	let site = assertDefined(ts.shift()).assertWord("switch").site;

	let braces = assertDefined(ts.shift()).assertGroup("{");

	/** @type {SwitchCase[]} */
	let cases = [];

	/** @type {?SwitchDefault} */
	let def = null;

	for (let tsInner of braces.fields) {
		if (tsInner[0].isWord("else")) {
			if (def !== null) {
				throw def.syntaxError("duplicate 'else' in switch");
			}

			def = buildSwitchDefault(tsInner);
		} else {
			if (def !== null) {
				throw def.syntaxError("switch 'else' must come last");
			}

			cases.push(buildSwitchCase(tsInner));
		}
	}

	// check the uniqueness of each case here
	/** @type {Set<string>} */
	let set = new Set()
	for (let c of cases) {
		let t = c.memberName.toString();
		if (set.has(t)) {
			throw c.memberName.syntaxError(`duplicate switch case '${t}')`);
		}

		set.add(t);
	}

	if (cases.length < 1) {
		throw site.syntaxError("expected at least one switch case");
	}

	return new SwitchExpr(site, controlExpr, cases, def);
}

/**
 * @param {Token[]} ts 
 * @returns {SwitchCase}
 */
function buildSwitchCase(ts) {
	/** @type {?Word} */
	let varName = null;

	/** @type {?Word} */
	let memberName = null;

	let arrowPos = Symbol.find(ts, "=>");

	if (arrowPos == -1) {
		throw ts[0].syntaxError("expected '=>' in switch case");
	} else if (arrowPos == 0) {
		throw ts[0].syntaxError("expected '<word>' or '<word>: <word>' to the left of '=>'");
	}

	let tsLeft = ts.splice(0, arrowPos);

	let colonPos = Symbol.find(tsLeft, ":");

	if (colonPos != -1) {
		varName = assertDefined(tsLeft.shift()).assertWord().assertNotKeyword();
		
		let maybeColon = tsLeft.shift();
		if (maybeColon === undefined) {
			throw varName.syntaxError("invalid switch case syntax, expected '(<name>: <enum-member>)', got '(<name>)'");
		} else {
			void maybeColon.assertSymbol(":");

			let maybeMemberName = tsLeft.shift();
			if (maybeMemberName === undefined) {
				throw maybeColon.syntaxError("invalid switch case syntax, expected member name after ':'");
			}

			memberName = maybeMemberName.assertWord().assertNotKeyword();

			if (tsLeft.length > 0) {
				throw tsLeft[0].syntaxError("unexpected token");
			}
		}
	} else {
		memberName = assertDefined(tsLeft.shift()).assertWord().assertNotKeyword();

		if (tsLeft.length > 0) {
			throw tsLeft[0].syntaxError("unexpected token");
		}
	}

	if (memberName === null) {
		throw new Error("unexpected");
	} else {
		let maybeArrow = ts.shift();

		if (maybeArrow === undefined) {
			throw memberName.syntaxError("expected '=>'");
		} else {
			let arrow = maybeArrow.assertSymbol("=>");

			/** @type {?ValueExpr} */
			let bodyExpr = null;

			if (ts.length == 0) {
				throw arrow.syntaxError("expected expression after '=>'");
			} else if (ts[0].isGroup("{")) {
				if (ts.length > 1) {
					throw ts[1].syntaxError("unexpected token");
				}

				let tsBody = ts[0].assertGroup("{", 1).fields[0];
				bodyExpr = buildValueExpr(tsBody);
			} else {
				bodyExpr = buildValueExpr(ts);
			}

			if (bodyExpr === null) {
				throw arrow.syntaxError("empty switch case body");
			} else {
				return new SwitchCase(arrow.site, varName, memberName, bodyExpr);
			}
		}
	}
}

/**
 * @param {Token[]} ts 
 * @returns {SwitchDefault}
 */
function buildSwitchDefault(ts) {
	let site = assertDefined(ts.shift()).assertWord("else").site;

	let maybeArrow = ts.shift();
	if (maybeArrow === undefined) {
		throw site.syntaxError("expected '=>' after 'else'");
	} else {
		let arrow = maybeArrow.assertSymbol("=>");

		/** @type {?ValueExpr} */
		let bodyExpr = null;
		if (ts.length == 0) {
			throw arrow.syntaxError("expected expression after '=>'");
		} else if (ts[0].isGroup("{")) {
			if (ts.length > 1) {
				throw ts[1].syntaxError("unexpected token");
			} else {
				bodyExpr = buildValueExpr(ts[0].assertGroup("{", 1).fields[0]);
			}
		} else {
			bodyExpr = buildValueExpr(ts);
		}

		if (bodyExpr === null) {
			throw arrow.syntaxError("empty else body");
		} else {
			return new SwitchDefault(arrow.site, bodyExpr);
		}
	}
}

/**
 * @param {Token[]} ts 
 * @returns {ListLiteralExpr}
 */
function buildListLiteralExpr(ts) {
	let site = assertDefined(ts.shift()).assertGroup("[", 0).site;

	let bracesPos = Group.find(ts, "{");

	if (bracesPos == -1) {
		throw site.syntaxError("invalid list literal expression syntax");
	}

	let itemTypeExpr = buildTypeExpr(ts.splice(0, bracesPos));

	let braces = assertDefined(ts.shift()).assertGroup("{");

	let itemExprs = braces.fields.map(fts => buildValueExpr(fts));

	return new ListLiteralExpr(site, itemTypeExpr, itemExprs);
}

/**
 * @param {Token[]} ts
 * @returns {MapLiteralExpr}
 */
function buildMapLiteralExpr(ts) {
	let site = assertDefined(ts.shift()).assertWord("Map").site;

	let bracket = assertDefined(ts.shift()).assertGroup("[", 1);

	let keyTypeExpr = buildTypeExpr(bracket.fields[0]);

	let bracesPos = Group.find(ts, "{");

	if (bracesPos == -1) {
		throw site.syntaxError("invalid map literal expression syntax");
	}

	let valueTypeExpr = buildTypeExpr(ts.splice(0, bracesPos));

	let braces = assertDefined(ts.shift()).assertGroup("{");

	/**
	 * @type {[ValueExpr, ValueExpr][]}
	 */
	let pairs = braces.fields.map(fts => {
		let colonPos = Symbol.find(fts, ":");

		if (colonPos == -1) {
			if (fts.length == 0) {
				throw braces.syntaxError("unexpected empty field");
			} else {
				throw fts[0].syntaxError("expected ':' in map literal field");
			}
		} else if (colonPos == 0) {
			throw fts[colonPos].syntaxError("expected expression before ':' in map literal field");
		} else if (colonPos == fts.length - 1) {
			throw fts[colonPos].syntaxError("expected expression after ':' in map literal field");
		}

		let keyExpr = buildValueExpr(fts.slice(0, colonPos));

		let valueExpr = buildValueExpr(fts.slice(colonPos+1));

		/**
		 * @type {[ValueExpr, ValueExpr]}
		 */
		return [keyExpr, valueExpr];
	});

	return new MapLiteralExpr(site, keyTypeExpr, valueTypeExpr, pairs);
}

/**
 * @param {Token[]} ts 
 * @returns {StructLiteralExpr}
 */
function buildStructLiteralExpr(ts) {
	let bracesPos = Group.find(ts, "{");

	assert(bracesPos != -1);

	let typeExpr = buildTypeExpr(ts.splice(0, bracesPos));

	let braces = assertDefined(ts.shift()).assertGroup("{");

	let nFields = braces.fields.length;

	if (nFields == 0) {
		throw braces.syntaxError(`expected at least one field in '${typeExpr.toString()}{...}'`);
	}

	let fields = braces.fields.map(fts => buildStructLiteralField(braces.site, fts, nFields > 1));

	return new StructLiteralExpr(typeExpr, fields);
}

/**
 * @param {Site} bracesSite
 * @param {Token[]} ts 
 * @param {boolean} isNamed
 * @returns {StructLiteralField}
 */
function buildStructLiteralField(bracesSite, ts, isNamed) {
	if (isNamed) {
		let maybeName = ts.shift();
		if (maybeName === undefined) {
			throw bracesSite.syntaxError("empty struct literal field");
		} else {
			let name = maybeName.assertWord();

			let maybeColon = ts.shift();
			if (maybeColon === undefined) {
				throw bracesSite.syntaxError("expected ':'");
			} else {
				let colon = maybeColon.assertSymbol(":");

				if (ts.length == 0) {
					throw colon.syntaxError("expected expression after ':'");
				} else {
					let valueExpr = buildValueExpr(ts);

					return new StructLiteralField(name.assertNotKeyword(), valueExpr);
				}
			}
		}
	} else {
		if (ts.length > 1 && ts[0].isWord() && ts[1].isSymbol(":")) {
			throw ts[0].syntaxError("unexpected key for struct literal constructor with 1 field");
		} else {
			let valueExpr = buildValueExpr(ts);

			return new StructLiteralField(null, valueExpr);
		}
	}
}

/**
 * @param {Token[]} ts 
 * @returns {ValueExpr}
 */
function buildValuePathExpr(ts) {
	let dcolonPos = Symbol.findLast(ts, "::");

	assert(dcolonPos != -1);

	let typeExpr = buildTypeExpr(ts.splice(0, dcolonPos));

	assertDefined(ts.shift()).assertSymbol("::");

	let memberName = assertDefined(ts.shift()).assertWord().assertNotKeyword();
	
	return new ValuePathExpr(typeExpr, memberName);
}

/**
 * @param {Site} site
 * @param {Type} type - expected type
 * @param {any} value - result of JSON.parse(string)
 * @param {string} path - context for debugging
 * @returns {ValueExpr}
 */
function buildLiteralExprFromJSON(site, type, value, path) {
	if (value === null) {
		throw site.typeError(`expected non-null value for parameter '${path}'`);
	} else if (type instanceof BoolType) {
		if (typeof value == "boolean") {
			return new PrimitiveLiteralExpr(new BoolLiteral(site, value));
		} else {
			throw site.typeError(`expected boolean for parameter '${path}', got '${value}'`);
		}
	} else if (type instanceof StringType) {
		if (typeof value == "string") {
			return new PrimitiveLiteralExpr(new StringLiteral(site, value));
		} else {
			throw site.typeError(`expected string for parameter '${path}', got '${value}'`);
		}
	} else if (type instanceof IntType) {
		if (typeof value == "number") {
			if (value%1 == 0.0) {
				return new PrimitiveLiteralExpr(new IntLiteral(site, BigInt(value)));
			} else {
				throw site.typeError(`expected round number for parameter '${path}', got '${value}'`);
			}
		} else {
			throw site.typeError(`expected number for parameter '${path}', got '${value}'`);
		}
	} else if (type instanceof ByteArrayType) {
		if (value instanceof Array) {
			/**
			 * @type {number[]}
			 */
			let bytes = [];

			for (let item of value) {
				if (typeof item == "number" && item%1 == 0.0 && item >= 0 && item < 256) {
					bytes.push(item);
				} else {
					throw site.typeError(`expected uint8[] for parameter '${path}', got '${value}'`);
				}
			}

			return new PrimitiveLiteralExpr(new ByteArrayLiteral(site, bytes));
		} else {
			throw site.typeError(`expected array for parameter '${path}', got '${value}'`);
		}
	} else if (type instanceof ListType) {
		if (value instanceof Array) {
			/**
			 * @type {ValueExpr[]}
			 */
			let items = [];

			for (let item of value) {
				items.push(buildLiteralExprFromJSON(site, type.itemType, item, path + "[]"));
			}

			return new ListLiteralExpr(site, new TypeExpr(site, type.itemType), items);
		} else {
			throw site.typeError(`expected array for parameter '${path}', got '${value}'`);
		}
	} else if (type instanceof MapType) {
		/**
		 * @type {[ValueExpr, ValueExpr][]}
		 */
   		let pairs = [];

		if (value instanceof Object && type.keyType instanceof StringType) {
			for (let key in value) {
				pairs.push([new PrimitiveLiteralExpr(new StringLiteral(site, key)), buildLiteralExprFromJSON(site, type.valueType, value[key], path + "." + key)]);
			}
		} else if (value instanceof Array) {
			for (let item of value) {
				if (item instanceof Array && item.length == 2) {
					pairs.push([
						buildLiteralExprFromJSON(site, type.keyType, item[0], path + "[0]"),
						buildLiteralExprFromJSON(site, type.valueType, item[1], path + "[1]"),
					]);
				} else {
					throw site.typeError(`expected array of pairs for parameter '${path}', got '${value}'`);
				}
			}
		} else {
			throw site.typeError(`expected array or object for parameter '${path}', got '${value}'`);
		}

		return new MapLiteralExpr(
			site, 
			new TypeExpr(site, type.keyType), 
			new TypeExpr(site, type.valueType),
			pairs
		);
	} else if (type instanceof StatementType && type.statement instanceof DataDefinition) {
		if (value instanceof Object) {
			let nFields = type.statement.nFields(site);
			/**
			 * @type {StructLiteralField[]}
			 */
			let fields = new Array(nFields);

			let nActual = Object.entries(value).length;

			if (nFields != nActual) {
				throw site.typeError(`expected object with ${nFields.toString} fields for parameter '${path}', got '${value}' with ${nActual.toString()} fields`);
			}

			for (let i = 0; i < nFields; i++) {
				let key = type.statement.getFieldName(i);

				let subValue = value[key];

				if (subValue === undefined) {
					throw site.typeError(`expected object with key '${key}' for parameter '${path}', got '${value}`);
				}

				let fieldType = type.statement.getFieldType(site, i);

				let valueExpr = buildLiteralExprFromJSON(site, fieldType, subValue, path + "." + key);

				fields[i] = new StructLiteralField(nFields == 1 ? null : new Word(site, key), valueExpr);
			}

			return new StructLiteralExpr(new TypeExpr(site, type), fields);
		} else {
			throw site.typeError(`expected object for parameter '${path}', got '${value}'`);
		}
	} else {
		throw site.typeError(`unhandled parameter type '${type.toString()}', for parameter ${path}`);
	}
}

/**
 * @param {Site} site
 * @param {Type} type - expected type
 * @param {PlutusCoreValue} value 
 * @param {string} path - context for debugging
 * @returns {ValueExpr}
 */
function buildLiteralExprFromValue(site, type, value, path) {
	if (type instanceof BoolType) {
		if (value instanceof PlutusCoreBool) {
			return new PrimitiveLiteralExpr(new BoolLiteral(site, value.bool));
		} else {
			throw site.typeError(`expected PlutusCoreBool for parameter '${path}', got '${value}'`);
		}
	} else if (type instanceof StringType) {
		if (value instanceof PlutusCoreDataValue && value.data instanceof ByteArrayData) {
			return new PrimitiveLiteralExpr(new StringLiteral(site, bytesToString(value.data.bytes)));
		} else {
			throw site.typeError(`expected ByteArrayData for parameter '${path}', got '${value}'`);
		}
	} else if (type instanceof IntType) {
		if (value instanceof PlutusCoreDataValue && value.data instanceof IntData) {
			return new PrimitiveLiteralExpr(new IntLiteral(site, value.data.value));
		} else {
			throw site.typeError(`expected IntData for parameter '${path}', got '${value}'`);
		}
	} else if (type instanceof ByteArrayType) {
		if (value instanceof PlutusCoreDataValue && value.data instanceof ByteArrayData) {
			return new PrimitiveLiteralExpr(new ByteArrayLiteral(site, value.data.bytes));
		} else {
			throw site.typeError(`expected ByteArrayData for parameter '${path}', got '${value}'`);
		}
	} else if (type instanceof ListType) {
		if (value instanceof PlutusCoreDataValue && value.data instanceof ListData) {
			/**
			 * @type {ValueExpr[]}
			 */
			let items = [];

			for (let data of value.data.list) {
				items.push(buildLiteralExprFromValue(site, type.itemType, new PlutusCoreDataValue(site, data), path + "[]"));
			}

			return new ListLiteralExpr(site, new TypeExpr(site, type.itemType), items);
		} else {
			throw site.typeError(`expected ListData for parameter '${path}', got '${value}'`);
		}
	} else if (type instanceof MapType) {
		if (value instanceof PlutusCoreDataValue && value.data instanceof MapData) {
			/**
			 * @type {[ValueExpr, ValueExpr][]}
			 */
			let pairs = [];

			for (let dataPair of value.data.map) {
				let keyExpr = buildLiteralExprFromValue(site, type.keyType, new PlutusCoreDataValue(site, dataPair[0]), path + "{key}");
				let valueExpr = buildLiteralExprFromValue(site, type.valueType, new PlutusCoreDataValue(site, dataPair[1]), path + "{value}");

				pairs.push([keyExpr, valueExpr]);
			}

			return new MapLiteralExpr(
				site, 
				new TypeExpr(site, type.keyType), 
				new TypeExpr(site, type.valueType),
				pairs
			);
		} else {
			throw site.typeError(`expected ListData for parameter '${path}', got '${value}'`);
		}
	} else if (type instanceof StatementType && type.statement instanceof DataDefinition) {
		if (value instanceof PlutusCoreDataValue && value.data instanceof ConstrData) {
			let nFields = type.statement.nFields(site);
			/**
			 * @type {StructLiteralField[]}
			 */
			let fields = new Array(nFields);

			if (nFields != value.data.fields.length) {
				throw site.typeError(`expected ConstrData with ${nFields.toString} fields for parameter '${path}', got '${value}' with ${value.data.fields.length.toString()} fields`);
			}

			for (let i = 0; i < nFields; i++) {
				let f = value.data.fields[i];

				let fieldType = type.statement.getFieldType(site, i);

				let valueExpr = buildLiteralExprFromValue(site, fieldType, new PlutusCoreDataValue(site, f), path + "." + i.toString());

				fields[i] = new StructLiteralField(nFields == 1 ? null : new Word(site, type.statement.getFieldName(i)), valueExpr);
			}

			return new StructLiteralExpr(new TypeExpr(site, type), fields);
		} else {
			throw site.typeError(`expected ConstrData for parameter '${path}', got '${value}'`);
		}
	} else {
		throw site.typeError(`unhandled parameter type '${type.toString()}', for parameter ${path}`);
	}
}


////////////////////////////
// Section 13: Builtin types
////////////////////////////

/**
 * Builtin Int type
 */
class IntType extends BuiltinType {
	constructor() {
		super();
	}

	toString() {
		return "Int";
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__neg":
			case "__pos":
				return Value.new(new FuncType([], new IntType()));
			case "__add":
			case "__sub":
			case "__mul":
			case "__div":
			case "__mod":
				return Value.new(new FuncType([new IntType()], new IntType()));
			case "__geq":
			case "__gt":
			case "__leq":
			case "__lt":
				return Value.new(new FuncType([new IntType()], new BoolType()));
			case "to_bool":
				return Value.new(new FuncType([], new BoolType()));
			case "to_hex":
			case "show":
				return Value.new(new FuncType([], new StringType()));
			default:
				return super.getInstanceMember(name);
		}
	}

	get path() {
		return "__helios__int";
	}
}

/**
 * Builtin bool type
 */
class BoolType extends BuiltinType {
	constructor() {
		super();
	}

	toString() {
		return "Bool";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "and":
			case "or":
				return Value.new(new FuncType([new FuncType([], new BoolType()), new FuncType([], new BoolType())], new BoolType()));
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__not":
				return Value.new(new FuncType([], new BoolType()));
			case "__and":
			case "__or":
				return Value.new(new FuncType([new BoolType()], new BoolType()));
			case "to_int":
				return Value.new(new FuncType([], new IntType()));
			case "show":
				return Value.new(new FuncType([], new StringType()));
			default:
				return super.getInstanceMember(name);
		}
	}

	get path() {
		return "__helios__bool";
	}
}

/**
 * Builtin string type
 */
class StringType extends BuiltinType {
	constructor() {
		super();
	}

	toString() {
		return "String";
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__add":
				return Value.new(new FuncType([new StringType()], new StringType()));
			case "starts_with":
			case "ends_with":
				return Value.new(new FuncType([new StringType()], new BoolType()));
			case "encode_utf8":
				return Value.new(new FuncType([], new ByteArrayType()));
			default:
				return super.getInstanceMember(name);
		}
	}

	get path() {
		return "__helios__string";
	}
}

/**
 * Builtin bytearray type
 */
class ByteArrayType extends BuiltinType {
	#size;

	/**
	 * @param {?number} size - can be null or 32 (result of hashing)
	 */
	constructor(size = null) {
		super();

		this.#size = size;
	}

	toString() {
		return "ByteArray";
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__add":
				return Value.new(new FuncType([new ByteArrayType()], new ByteArrayType()));
			case "length":
				return Value.new(new IntType());
			case "slice":
				return Value.new(new FuncType([new IntType(), new IntType()], new ByteArrayType()));
			case "starts_with":
			case "ends_with":
				return Value.new(new FuncType([new ByteArrayType()], new BoolType()));
			case "sha2":
			case "sha3":
			case "blake2b":
				return Value.new(new FuncType([], new ByteArrayType(32)));
			case "decode_utf8":
			case "show":
				return Value.new(new FuncType([], new StringType()));
			default:
				return super.getInstanceMember(name);
		}
	}

	get path() {
		return `__helios__bytearray${this.#size === null ? "" : this.#size}`;
	}
}

/**
 * Builtin list type
 */
class ListType extends BuiltinType {
	#itemType;

	/**
	 * @param {Type} itemType 
	 */
	constructor(itemType) {
		super();
		this.#itemType = itemType;
	}

	get itemType() {
		return this.#itemType;
	}

	toString() {
		return `[]${this.#itemType.toString()}`;
	}

	/**
	 * @param {Site} site 
	 * @param {Type} type 
	 * @returns 
	 */
	isBaseOf(site, type) {
		if (type instanceof ListType) {
			return this.#itemType.isBaseOf(site, type.itemType);
		} else {
			return false;
		}
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "new":
				return Value.new(new FuncType([new IntType(), new FuncType([new IntType()], this.#itemType)], this));
			case "new_const":
				return Value.new(new FuncType([new IntType(), this.#itemType], this));
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__add":
				return Value.new(new FuncType([this], this));
			case "length":
				return Value.new(new IntType());
			case "head":
				return Value.new(this.#itemType);
			case "tail":
				return Value.new(new ListType(this.#itemType));
			case "is_empty":
				return Value.new(new FuncType([], new BoolType()));
			case "get":
				return Value.new(new FuncType([new IntType()], this.#itemType));
			case "prepend":
				return Value.new(new FuncType([this.#itemType], new ListType(this.#itemType)));
			case "any":
			case "all":
				return Value.new(new FuncType([new FuncType([this.#itemType], new BoolType())], new BoolType()));
			case "find":
				return Value.new(new FuncType([new FuncType([this.#itemType], new BoolType())], this.#itemType));
			case "filter":
				return Value.new(new FuncType([new FuncType([this.#itemType], new BoolType())], new ListType(this.#itemType)));
			case "fold":
				return new FoldListFuncValue(this.#itemType);
			case "map":
				return new MapListFuncValue(this.#itemType);
			default:
				return super.getInstanceMember(name);
		}
	}

	get path() {
		return `__helios__${this.#itemType instanceof BoolType ? "bool" : ""}list`;
	}
}

/**
 * A special func value with parametric arg types, returned by list.fold
 * Instead of creating special support for parametric function types we can just created these special classes (parametric types aren't expected to be needed a lot anyway)
 */
class FoldListFuncValue extends FuncValue {
	#itemType;

	/**
	 * @param {Type} itemType 
	 */
	constructor(itemType) {
		super(new FuncType([new AnyType(), itemType], new AnyType())); // dummy FuncType
		this.#itemType = itemType;
	}

	toString() {
		return `[a](a, (a, ${this.#itemType.toString()}) -> a) -> a`;
	}

	/**
	 * @param {Site} site 
	 * @returns {Type}
	 */
	getType(site) {
		throw site.typeError("can't get type of type parametric function");
	}

	/**
	 * @param {Site} site 
	 * @param {Type} type 
	 * @returns {boolean}
	 */
	isInstanceOf(site, type) {
		throw site.typeError("can't determine if type parametric function is instanceof a type");
	}

	/**
	 * @param {Site} site 
	 * @param {Value[]} args 
	 * @returns {Value}
	 */
	call(site, args) {
		if (args.length != 2) {
			throw site.typeError(`expected 2 arg(s), got ${args.length}`);
		}

		let zType = args[1].getType(site);

		let fnType = new FuncType([zType, this.#itemType], zType);

		if (!args[0].isInstanceOf(site, fnType)) {
			throw site.typeError("wrong function type for list.fold");
		}

		return Value.new(zType);
	}
}

/**
 * A special func value with parametric arg types, returned by list.map
 */
class MapListFuncValue extends FuncValue {
	#itemType;

	/**
	 * @param {Type} itemType 
	 */
	constructor(itemType) {
		super(new FuncType([itemType], new AnyType())); // dummy
		this.#itemType = itemType;
	}

	toString() {
		return `[a]((${this.#itemType.toString()}) -> a) -> []a`;
	}

	/**
	 * @param {Site} site 
	 * @returns {Type}
	 */
	getType(site) {
		throw site.typeError("can't get type of type parametric function");
	}

	/**
	 * @param {Site} site 
	 * @param {Type} type 
	 * @returns {boolean}
	 */
	isInstanceOf(site, type) {
		throw site.typeError("can't determine if type parametric function is instanceof a type");
	}

	/**
	 * @param {Site} site 
	 * @param {Value[]} args 
	 * @returns {Value}
	 */
	call(site, args) {
		if (args.length != 1) {
			throw site.typeError(`map expects 1 arg(s), got ${args.length})`);
		}

		let fnType = args[0].getType(site);

		if (!(fnType instanceof FuncType)) {
			throw site.typeError("arg is not a func type");
		} else {

			if (fnType.nArgs != 1) {
				throw site.typeError("func arg takes wrong number of args");
			}

			let retItemType = fnType.retType;
			let testFuncType = new FuncType([this.#itemType], retItemType);

			if (!fnType.isBaseOf(site, testFuncType)) {
				throw site.typeError("bad map func");
			}

			return Value.new(new ListType(retItemType));
		}
	}
}

/**
 * Builtin map type (in reality list of key-value pairs)
 */
class MapType extends BuiltinType {
	#keyType;
	#valueType;

	/**
	 * @param {Type} keyType 
	 * @param {Type} valueType 
	 */
	constructor(keyType, valueType) {
		super();
		this.#keyType = keyType;
		this.#valueType = valueType;
	}

	get keyType() {
		return this.#keyType;
	}

	get valueType() {
		return this.#valueType;
	}

	toString() {
		return `Map[${this.#keyType.toString()}]${this.#valueType.toString()}`;
	}

	/**
	 * @param {Site} site 
	 * @param {Type} type 
	 * @returns 
	 */
	 isBaseOf(site, type) {
		if (type instanceof MapType) {
			return this.#keyType.isBaseOf(site, type.#keyType) && this.#valueType.isBaseOf(site, type.#valueType);
		} else {
			return false;
		}
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__add":
				return Value.new(new FuncType([this], this));
			case "length":
				return Value.new(new IntType());
			case "is_empty":
				return Value.new(new FuncType([], new BoolType()));
			case "get":
				return Value.new(new FuncType([this.#keyType], this.#valueType));
			case "get_safe":
				return Value.new(new FuncType([this.#keyType], new OptionType(this.#valueType)));
			case "all":
			case "any":
				return Value.new(new FuncType([new FuncType([this.#keyType, this.#valueType], new BoolType())], new BoolType()));
			case "all_keys":
			case "any_key":
				return Value.new(new FuncType([new FuncType([this.#keyType], new BoolType())], new BoolType()));
			case "all_values":
			case "any_value":
				return Value.new(new FuncType([new FuncType([this.#valueType], new BoolType())], new BoolType()));
			case "filter":
				return Value.new(new FuncType([new FuncType([this.#keyType, this.#valueType], new BoolType())], this));
			case "filter_by_key":
				return Value.new(new FuncType([new FuncType([this.#keyType], new BoolType())], this));
			case "filter_by_value":
				return Value.new(new FuncType([new FuncType([this.#valueType], new BoolType())], this));
			case "fold":
				return new FoldMapFuncValue(this.#keyType, this.#valueType);
			case "fold_keys":
				return new FoldListFuncValue(this.#keyType);
			case "fold_values":
				return new FoldListFuncValue(this.#valueType);
			default:
				return super.getInstanceMember(name);
		}
	}

	get path() {
		return `__helios__${this.#valueType instanceof BoolType ? "bool" : ""}map`;
	}
}

/**
 * A special func value with parametric arg types, returned by map.fold.
 */
 class FoldMapFuncValue extends FuncValue {
	#keyType;
	#valueType;

	/**
	 * @param {Type} keyType 
	 * @param {Type} valueType
	 */
	constructor(keyType, valueType) {
		super(new FuncType([new AnyType(), keyType, valueType], new AnyType())); // dummy FuncType
		this.#keyType = keyType;
		this.#valueType = valueType;
	}

	toString() {
		return `[a](a, (a, ${this.#keyType.toString()}, ${this.#valueType.toString()}) -> a) -> a`;
	}

	/**
	 * @param {Site} site 
	 * @returns {Type}
	 */
	getType(site) {
		throw site.typeError("can't get type of type parametric function");
	}

	/**
	 * @param {Site} site 
	 * @param {Type} type 
	 * @returns {boolean}
	 */
	isInstanceOf(site, type) {
		throw site.typeError("can't determine if type parametric function is instanceof a type");
	}

	/**
	 * @param {Site} site 
	 * @param {Value[]} args 
	 * @returns {Value}
	 */
	call(site, args) {
		if (args.length != 2) {
			throw site.typeError(`expected 3 arg(s), got ${args.length}`);
		}

		let zType = args[1].getType(site);

		let fnType = new FuncType([zType, this.#keyType, this.#valueType], zType);

		if (!args[0].isInstanceOf(site, fnType)) {
			throw site.typeError("wrong function type for map.fold");
		}

		return Value.new(zType);
	}
}

/**
 * Builtin option type
 */
class OptionType extends BuiltinType {
	#someType;

	/**
	 * @param {Type} someType 
	 */
	constructor(someType) {
		super();
		this.#someType = someType;
	}

	toString() {
		return `Option[${this.#someType.toString()}]`;
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	nEnumMembers(site) {
		return 2;
	}

	/**
	 * @param {Site} site 
	 * @param {Type} type 
	 * @returns {boolean}
	 */
	isBaseOf(site, type) {
		if (type instanceof OptionType) {
			return this.#someType.isBaseOf(site, type.#someType);
		} else {
			return (new OptionSomeType(this.#someType)).isBaseOf(site, type) || 
				(new OptionNoneType(this.#someType)).isBaseOf(site, type);
		}
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "Some":
				return new OptionSomeType(this.#someType);
			case "None":
				return new OptionNoneType(this.#someType);
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			default:
				return super.getInstanceMember(name);
		}
	}

	get path() {
		return `__helios__option`;
	}
}

/**
 * Member type of OptionType with some content
 */
class OptionSomeType extends BuiltinEnumMember {
	#someType;

	/**
	 * @param {Type} someType 
	 */
	constructor(someType) {
		super(new OptionType(someType));
		this.#someType = someType;
	}

	toString() {
		return `Option[${this.#someType.toString()}]::Some`;
	}

	/**
	 * @param {Site} site 
	 * @param {Type} type 
	 * @returns {boolean}
	 */
	isBaseOf(site, type) {
		if (type instanceof OptionSomeType) {
			return this.#someType.isBaseOf(site, type.#someType);
		} else {
			return false;
		}
	}

	/**
	 * @param {Site} site
	 * @returns {number}
	 */
	nFields(site) {
		return 1;
	}

	/**
	 * @param {Site} site
	 * @param {number} i
	 * @returns {Type}
	 */
	getFieldType(site, i) {
		return this.#someType;
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "from_data":
				throw name.referenceError(`'${this.toString()}::from_data' undefined`);
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__eq": // more generic than __eq/__neq defined in BuiltinType
			case "__neq":
				return Value.new(new FuncType([new OptionType(this.#someType)], new BoolType()));
			case "some":
				return Value.new(this.#someType);
			default:
				return super.getInstanceMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		return 0;
	}

	get path() {
		return `__helios__option__${this.#someType instanceof BoolType ? "bool" : ""}some`;
	}
}

/**
 * Member type of OptionType with no content
 */
class OptionNoneType extends BuiltinEnumMember {
	#someType;

	/**
	 * @param {Type} someType 
	 */
	constructor(someType) {
		super(new OptionType(someType));
		this.#someType = someType;
	}

	toString() {
		return `Option[${this.#someType.toString()}]::None`;
	}

	/**
	 * @param {Site} site 
	 * @param {Type} type 
	 * @returns {boolean}
	 */
	isBaseOf(site, type) {
		if (type instanceof OptionNoneType) {
			return this.#someType.isBaseOf(site, type.#someType);
		} else {
			return false;
		}
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "from_data":
				throw name.referenceError(`'${this.toString()}::from_data' undefined`);
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__eq": // more generic than __eq/__neq defined in BuiltinType
			case "__neq":
				return Value.new(new FuncType([new OptionType(this.#someType)], new BoolType()));
			default:
				return super.getInstanceMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		return 1;
	}

	get path() {
		return "__helios__option__none";
	}

	/**
	 * Instantiates self as value
	 * @param {Site} site
	 * @returns {Value}
	 */
	assertValue(site) {
		return Value.new(this);
	}
}

/**
 * Base type of other ValidatorHash etc. (all functionality is actually implemented here)
 */
class HashType extends BuiltinType {
	constructor() {
		super();
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "new":
				return Value.new(new FuncType([new ByteArrayType()], this));
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "show":
				return Value.new(new FuncType([], new StringType()));
			default:
				return super.getInstanceMember(name);
		}
	}

	get path() {
		return "__helios__hash"
	}
}

/**
 * Builtin PubKeyHash type
 */
class PubKeyHashType extends HashType {
	toString() {
		return "PubKeyHash";
	}
}

/**
 * Builtin ValidatorHash type
 */
class ValidatorHashType extends HashType {
	#purpose;

	/**
	 * @param {number} purpose 
	 */
	constructor(purpose = -1) {
		super();
		this.#purpose = purpose;
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "CURRENT":
				if (this.macrosAllowed) {
					if (this.#purpose == ScriptPurpose.Spending || this.#purpose == ScriptPurpose.Testing) {
						return Value.new(this);
					} else {
						throw name.referenceError("'ValidatorHash::CURRENT' only available in spending script");
					}
				} else {
					throw name.referenceError("'ValidatorHash::CURRENT' can only be used after 'main'");
				}
			default:
				return super.getTypeMember(name);
		}
	}

	toString() {
		return "ValidatorHash";
	}
}

/**
 * Builtin MintingPolicyHash type
 */
class MintingPolicyHashType extends HashType {
	#purpose;

	/**
	 * @param {number} purpose 
	 */
	constructor(purpose = -1) {
		super();
		this.#purpose = purpose;
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	 getTypeMember(name) {
		switch (name.value) {
			case "CURRENT":
				if (this.macrosAllowed) {
					if (this.#purpose == ScriptPurpose.Minting) {
						return Value.new(this);
					} else {
						throw name.referenceError("'MintingPolicyHash::CURRENT' only available in minting script");
					}
				} else {
					throw name.referenceError("'MintingPolicyHash::CURRENT' can only be used after 'main'");
				}
			default:
				return super.getTypeMember(name);
		}
	}

	toString() {
		return "MintingPolicyHash";
	}
}

/**
 * Builtin DatumHash type
 */
class DatumHashType extends HashType {
	toString() {
		return "DatumHash";
	}
}

/**
 * Builtin ScriptContext type
 */
class ScriptContextType extends BuiltinType {
	#purpose;

	/**
	 * @param {number} purpose 
	 */
	constructor(purpose) {
		super();
		this.#purpose = purpose;
	}

	toString() {
		return "ScriptContext";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
 	getTypeMember(name) {
		switch (name.value) {
			case "new_spending":
				if (this.macrosAllowed) {
					if (this.#purpose == ScriptPurpose.Spending || this.#purpose == ScriptPurpose.Testing) {
						return Value.new(new FuncType([new TxType(), new TxOutputIdType()], this));
					} else {
						throw name.referenceError("'ScriptContext::new_spending' only avaiable for spending");
					}
				} else {
					if (this.#purpose == ScriptPurpose.Staking || this.#purpose == ScriptPurpose.Minting) {
						throw name.referenceError("'ScriptContext::new_spending' only avaiable for spending  scripts");
					} else {
						throw name.referenceError("'ScriptContext::new_spending' can only be used after 'main'");
					}
				}
			case "new_minting":
				if (this.macrosAllowed) {
					if (this.#purpose == ScriptPurpose.Minting || this.#purpose == ScriptPurpose.Testing) {
						return Value.new(new FuncType([new TxType(), new MintingPolicyHashType()], this));
					} else {
						throw name.referenceError("'ScriptContext::new_minting' only avaiable for minting scripts");
					}
				} else {
					if (this.#purpose == ScriptPurpose.Staking || this.#purpose == ScriptPurpose.Spending) {
						throw name.referenceError("'ScriptContext::new_minting' only avaiable for minting scripts");
					} else {
						throw name.referenceError("'ScriptContext::new_minting' can only be used after 'main'");
					}
				}
			case "new_rewarding":
				if (this.macrosAllowed) {
					if (this.#purpose == ScriptPurpose.Staking || this.#purpose == ScriptPurpose.Testing) {
						return Value.new(new FuncType([new TxType(), new StakingCredentialType()], this));
					} else {
						throw name.referenceError("'ScriptContext::new_rewarding' only avaiable for staking scripts");
					}
				} else {
					if (this.#purpose == ScriptPurpose.Spending || this.#purpose == ScriptPurpose.Minting) {
						throw name.referenceError("'ScriptContext::new_rewarding' only avaiable for staking scripts");
					} else {
						throw name.referenceError("'ScriptContext::new_rewarding' can only be used after 'main'");
					}
				}
			case "new_certifying":
				if (this.macrosAllowed) {
					if (this.#purpose == ScriptPurpose.Staking || this.#purpose == ScriptPurpose.Testing) {
						return Value.new(new FuncType([new TxType(), new DCertType()], this));
					} else {
						throw name.referenceError("'ScriptContext::new_certifying' only avaiable for staking scripts");
					}
				} else {
					if (this.#purpose == ScriptPurpose.Spending || this.#purpose == ScriptPurpose.Minting) {
						throw name.referenceError("'ScriptContext::new_certifying' only avaiable for staking scripts");
					} else {
						throw name.referenceError("'ScriptContext::new_certifying' can only be used after 'main'");
					}
				}
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "tx":
				return Value.new(new TxType());
			case "get_spending_purpose_output_id":
				if (this.#purpose == ScriptPurpose.Minting || this.#purpose == ScriptPurpose.Staking) {
					throw name.referenceError("not available in minting script");
				} else {
					return Value.new(new FuncType([], new TxOutputIdType()));
				}
			case "get_current_validator_hash":
				if (this.#purpose == ScriptPurpose.Minting || this.#purpose == ScriptPurpose.Staking) {
					throw name.referenceError("not available in minting script");
				} else {
					return Value.new(new FuncType([], new ValidatorHashType(this.#purpose)));
				}
			case "get_current_minting_policy_hash":
				if (this.#purpose == ScriptPurpose.Spending || this.#purpose == ScriptPurpose.Staking) {
					throw name.referenceError("not available in minting script");
				} else {
					return Value.new(new FuncType([], new MintingPolicyHashType(this.#purpose)));
				}
			case "get_current_input":
				if (this.#purpose == ScriptPurpose.Minting || this.#purpose == ScriptPurpose.Staking) {
					throw name.referenceError("not available in spending script");
				} else {
					return Value.new(new FuncType([], new TxInputType()));
				}
			case "get_staking_purpose":
				if (this.#purpose == ScriptPurpose.Minting || this.#purpose == ScriptPurpose.Spending) {
					throw name.referenceError("not available in staking script");
				} else {
					return Value.new(new FuncType([], new StakingPurposeType()));
				}
			default:
				return super.getInstanceMember(name);
		}
	}

	get path() {
		return "__helios__scriptcontext";
	}
}

/**
 * Builtin StakingPurpose type (Rewarding or Certifying)
 */
 class StakingPurposeType extends BuiltinType {
	toString() {
		return "StakingPurpose";
	}

	/**
	 * @param {Site} site 
	 * @param {Type} type 
	 * @returns {boolean}
	 */
	isBaseOf(site, type) {
		let b = super.isBaseOf(site, type) ||
				(new StakingRewardingPurposeType()).isBaseOf(site, type) || 
				(new StakingCertifyingPurposeType()).isBaseOf(site, type); 

		return b;
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "Rewarding":
				return new StakingRewardingPurposeType();
			case "Certifying":
				return new StakingCertifyingPurposeType();
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	nEnumMembers(site) {
		return 2;
	}

	get path() {
		return "__helios__stakingpurpose";
	}
}

/**
 * Builtin StakingPurpose::Rewarding
 */
class StakingRewardingPurposeType extends BuiltinEnumMember {
	constructor() {
		super(new StakingPurposeType());
	}

	toString() {
		return "StakingPurpose::Rewarding";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "from_data":
				throw name.referenceError(`'${this.toString()}::from_data' undefined`);
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__eq":
			case "__neq":
				return Value.new(new FuncType([new StakingPurposeType()], new BoolType()));
			case "credential":
				return Value.new(new StakingCredentialType());
			default:
				return super.getInstanceMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		return 2;
	}

	get path() {
		return "__helios__stakingpurpose__rewarding";
	}
}

/**
 * Builtin StakingPurpose::Certifying type
 */
class StakingCertifyingPurposeType extends BuiltinEnumMember {
	constructor() {
		super(new StakingPurposeType());
	}

	toString() {
		return "StakingPurpose::Certifying";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "from_data":
				throw name.referenceError(`'${this.toString()}::from_data' undefined`);
			default:
				return super.getTypeMember(name);
		}
	}
	
	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__eq":
			case "__neq":
				return Value.new(new FuncType([new StakingPurposeType()], new BoolType()));
			case "dcert":
				return Value.new(new DCertType());
			default:
				return super.getInstanceMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		return 3;
	}

	get path() {
		return "__helios__stakingpurpose__certifying";
	}
}

class DCertType extends BuiltinType {
	toString() {
		return "DCert";
	}

	/**
	 * @param {Site} site 
	 * @param {Type} type 
	 * @returns {boolean}
	 */
	isBaseOf(site, type) {
		let b = super.isBaseOf(site, type) ||
				(new RegisterDCertType()).isBaseOf(site, type) || 
				(new DeregisterDCertType()).isBaseOf(site, type) || 
				(new DelegateDCertType()).isBaseOf(site, type) || 
				(new RegisterPoolDCertType()).isBaseOf(site, type) ||
				(new RetirePoolDCertType()).isBaseOf(site, type); 

		return b;
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "new_register":
				return Value.new(new FuncType([new StakingCredentialType()], new RegisterDCertType()));
			case "new_deregister":
				return Value.new(new FuncType([new StakingCredentialType()], new DeregisterDCertType()));
			case "new_delegate":
				return Value.new(new FuncType([new StakingCredentialType(), new PubKeyHashType()], new DelegateDCertType()));
			case "new_register_pool":
				return Value.new(new FuncType([new PubKeyHashType(), new PubKeyHashType()], new RegisterPoolDCertType()));
			case "new_retire_pool":
				return Value.new(new FuncType([new PubKeyHashType(), new IntType()], new RetirePoolDCertType()));
			case "Register":
				return new RegisterDCertType();
			case "Deregister":
				return new DeregisterDCertType();
			case "Delegate":
				return new DelegateDCertType();
			case "RegisterPool":
				return new RegisterPoolDCertType();
			case "RetirePool":
				return new RetirePoolDCertType();
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	nEnumMembers(site) {
		return 5;
	}

	get path() {
		return "__helios__dcert";
	}
}

class RegisterDCertType extends BuiltinEnumMember {
	constructor() {
		super(new DCertType());
	}

	toString() {
		return "DCert::Register";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "from_data":
				throw name.referenceError(`'${this.toString()}::from_data' undefined`);
			default:
				return super.getTypeMember(name);
		}
	}
	
	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__eq":
			case "__neq":
				return Value.new(new FuncType([new DCertType()], new BoolType()));
			case "credential":
				return Value.new(new StakingCredentialType());
			default:
				return super.getInstanceMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		return 0;
	}

	get path() {
		return "__helios__dcert__register";
	}
}

class DeregisterDCertType extends BuiltinEnumMember {
	constructor() {
		super(new DCertType());
	}

	toString() {
		return "DCert::Deregister";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "from_data":
				throw name.referenceError(`'${this.toString()}::from_data' undefined`);
			default:
				return super.getTypeMember(name);
		}
	}
	
	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__eq":
			case "__neq":
				return Value.new(new FuncType([new DCertType()], new BoolType()));
			case "credential":
				return Value.new(new StakingCredentialType());
			default:
				return super.getInstanceMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		return 1;
	}

	get path() {
		return "__helios__dcert__deregister";
	}
}

class DelegateDCertType extends BuiltinEnumMember {
	constructor() {
		super(new DCertType());
	}

	toString() {
		return "DCert::Delegate";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "from_data":
				throw name.referenceError(`'${this.toString()}::from_data' undefined`);
			default:
				return super.getTypeMember(name);
		}
	}
	
	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__eq":
			case "__neq":
				return Value.new(new FuncType([new DCertType()], new BoolType()));
			case "delegator":
				return Value.new(new StakingCredentialType());
			case "pool_id":
				return Value.new(new PubKeyHashType());
			default:
				return super.getInstanceMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		return 2;
	}

	get path() {
		return "__helios__dcert__delegate";
	}
}

class RegisterPoolDCertType extends BuiltinEnumMember {
	constructor() {
		super(new DCertType());
	}

	toString() {
		return "DCert::RegisterPool";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "from_data":
				throw name.referenceError(`'${this.toString()}::from_data' undefined`);
			default:
				return super.getTypeMember(name);
		}
	}
	
	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__eq":
			case "__neq":
				return Value.new(new FuncType([new DCertType()], new BoolType()));
			case "pool_id":
				return Value.new(new PubKeyHashType());
			case "pool_vrf":
				return Value.new(new PubKeyHashType());
			default:
				return super.getInstanceMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		return 3;
	}

	get path() {
		return "__helios__dcert__registerpool";
	}
}

class RetirePoolDCertType extends BuiltinEnumMember {
	constructor() {
		super(new DCertType());
	}

	toString() {
		return "DCert::RetirePool";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "from_data":
				throw name.referenceError(`'${this.toString()}::from_data' undefined`);
			default:
				return super.getTypeMember(name);
		}
	}
	
	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__eq":
			case "__neq":
				return Value.new(new FuncType([new DCertType()], new BoolType()));
			case "pool_id":
				return Value.new(new PubKeyHashType());
			case "epoch":
				return Value.new(new IntType());
			default:
				return super.getInstanceMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		return 4;
	}

	get path() {
		return "__helios__dcert__retirepool";
	}
}

/**
 * Builtin Tx type
 */
class TxType extends BuiltinType {
	constructor() {
		super();
	}

	toString() {
		return "Tx";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "new":
				if (this.macrosAllowed) {
					return Value.new(new FuncType([
						new ListType(new TxInputType()), // 0
						new ListType(new TxInputType()), // 1
						new ListType(new TxOutputType()), // 2
						new MoneyValueType(), // 3
						new MoneyValueType(), // 4
						new ListType(new DCertType()), // 5
						new MapType(new StakingCredentialType(), new IntType()), // 6
						new TimeRangeType(), // 7
						new ListType(new PubKeyHashType()), // 8
						new MapType(new DatumHashType(), new AnyDataType()) // 10
					], this));
				} else {
					throw name.referenceError("'Tx::new' can only be used after 'main'");
				}
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "inputs":
				return Value.new(new ListType(new TxInputType()));
			case "ref_inputs":
				return Value.new(new ListType(new TxInputType()));
			case "outputs":
				return Value.new(new ListType(new TxOutputType()));
			case "fee":
				return Value.new(new MoneyValueType());
			case "minted":
				return Value.new(new MoneyValueType());
			case "dcerts":
				return Value.new(new ListType(new DCertType()));
			case "withdrawals":
				return Value.new(new MapType(new StakingCredentialType(), new IntType()));
			case "time_range":
				return Value.new(new TimeRangeType());
			case "signatories":
				return Value.new(new ListType(new PubKeyHashType()));
			case "id":
				return Value.new(new TxIdType());
			case "now":
				return Value.new(new FuncType([], new TimeType()));
			case "find_datum_hash":
				return Value.new(new FuncType([new AnyDataType()], new DatumHashType()));
			case "outputs_sent_to":
				return Value.new(new FuncType([new PubKeyHashType()], new ListType(new TxOutputType())));
			case "outputs_sent_to_datum":
				return Value.new(new FuncType([new PubKeyHashType(), new AnyDataType()], new ListType(new TxOutputType())));
			case "outputs_locked_by":
				return Value.new(new FuncType([new ValidatorHashType()], new ListType(new TxOutputType())));
			case "outputs_locked_by_datum":
				return Value.new(new FuncType([new ValidatorHashType(), new AnyDataType()], new ListType(new TxOutputType())));
			case "value_sent_to":
				return Value.new(new FuncType([new PubKeyHashType()], new MoneyValueType()));
			case "value_sent_to_datum":
				return Value.new(new FuncType([new PubKeyHashType(), new AnyDataType()], new MoneyValueType()));
			case "value_locked_by":
				return Value.new(new FuncType([new ValidatorHashType()], new MoneyValueType()));
			case "value_locked_by_datum":
				return Value.new(new FuncType([new ValidatorHashType(), new AnyDataType()], new MoneyValueType()));
			case "is_signed_by":
				return Value.new(new FuncType([new PubKeyHashType()], new BoolType()));
			default:
				return super.getInstanceMember(name);
		}
	}

	get path() {
		return "__helios__tx";
	}
}

/**
 * Builtin TxId type
 */
class TxIdType extends BuiltinType {
	toString() {
		return "TxId";
	}

	get path() {
		return "__helios__txid";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	 getTypeMember(name) {
		switch (name.value) {
			case "new":
				return Value.new(new FuncType([new ByteArrayType()], this));
			case "CURRENT":
				if (this.macrosAllowed) {
					return Value.new(this);
				} else {
					throw name.referenceError("'TxId::CURRENT' can only be used after 'main'");
				}
			default:
				return super.getTypeMember(name);
		}
	}
}

/**
 * Builtin TxInput type
 */
class TxInputType extends BuiltinType {
	toString() {
		return "TxInput";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "new":
				if (this.macrosAllowed) {
					return Value.new(new FuncType([
						new TxOutputIdType(), // 0
						new TxOutputType(), // 1
					], this));
				} else {
					throw name.referenceError("'TxInput::new' can only be used after 'main'");
				}
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "output_id":
				return Value.new(new TxOutputIdType());
			case "output":
				return Value.new(new TxOutputType());
			default:
				return super.getInstanceMember(name);
		}
	}

	get path() {
		return "__helios__txinput";
	}
}

/**
 * Builtin TxOutput type
 */
class TxOutputType extends BuiltinType {
	toString() {
		return "TxOutput";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "new":
				if (this.macrosAllowed) {
					return Value.new(new FuncType([
						new AddressType(), // 0
						new MoneyValueType(), // 1
						new OutputDatumType(), // 2
					], this));
				} else {
					throw name.referenceError("'TxOutput::new' can only be used after 'main'");
				}
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "address":
				return Value.new(new AddressType());
			case "value":
				return Value.new(new MoneyValueType());
			case "datum":
				return Value.new(new OutputDatumType());
			default:
				return super.getInstanceMember(name);
		}
	}

	get path() {
		return "__helios__txoutput";
	}
}
class OutputDatumType extends BuiltinType {
	toString() {
		return "OutputDatum";
	}

	/**
	 * @param {Site} site 
	 * @param {Type} type 
	 * @returns {boolean}
	 */
	isBaseOf(site, type) {
		let b = super.isBaseOf(site, type) ||
				(new OutputDatumNoneType()).isBaseOf(site, type) || 
				(new OutputDatumHashType()).isBaseOf(site, type) || 
				(new OutputDatumInlineType()).isBaseOf(site, type);; 

		return b;
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "new_none":
				if (this.macrosAllowed) {
					return Value.new(new FuncType([], new OutputDatumNoneType()));
				} else {
					throw name.referenceError("'OutputDatum::new_none' only allowed after 'main'");
				}
			case "new_hash":
				if (this.macrosAllowed) {
					return Value.new(new FuncType([new DatumHashType()], new OutputDatumHashType()));
				} else {
					throw name.referenceError("'OutputDatum::new_hash' only allowed after 'main'");
				}
			case "new_inline":
				if (this.macrosAllowed) {
					return Value.new(new FuncType([new AnyDataType()], new OutputDatumInlineType()));
				} else {
					throw name.referenceError("'OutputDatum::new_inline' only allowed after 'main'");
				}
			case "None":
				return new OutputDatumNoneType();
			case "Hash":
				return new OutputDatumHashType();
			case "Inline":
				return new OutputDatumInlineType();
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	nEnumMembers(site) {
		return 3;
	}

	get path() {
		return "__helios__outputdatum";
	}
}

class OutputDatumNoneType extends BuiltinEnumMember {
	constructor() {
		super(new OutputDatumType);
	}

	toString() {
		return "OutputDatum::None";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "from_data":
				throw name.referenceError(`'${this.toString()}::from_data' undefined`);
			default:
				return super.getTypeMember(name);
		}
	}
	
	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__eq":
			case "__neq":
				return Value.new(new FuncType([new OutputDatumType()], new BoolType()));
			default:
				return super.getInstanceMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		return 0;
	}

	get path() {
		return "__helios__outputdatum__none";
	}
}

class OutputDatumHashType extends BuiltinEnumMember {
	constructor() {
		super(new OutputDatumType());
	}

	toString() {
		return "OutputDatum::Hash";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "from_data":
				throw name.referenceError(`'${this.toString()}::from_data' undefined`);
			default:
				return super.getTypeMember(name);
		}
	}
	
	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__eq":
			case "__neq":
				return Value.new(new FuncType([new OutputDatumType()], new BoolType()));
			case "hash":
				return Value.new(new DatumHashType());
			default:
				return super.getInstanceMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		return 1;
	}

	get path() {
		return "__helios__outputdatum__hash";
	}
}

class OutputDatumInlineType extends BuiltinEnumMember {
	constructor() {
		super(new OutputDatumType());
	}

	toString() {
		return "OutputDatum::Inline";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "from_data":
				throw name.referenceError(`'${this.toString()}::from_data' undefined`);
			default:
				return super.getTypeMember(name);
		}
	}
	
	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__eq":
			case "__neq":
				return Value.new(new FuncType([new OutputDatumType()], new BoolType()));
			case "data":
				return Value.new(new RawDataType());
			default:
				return super.getInstanceMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		return 2;
	}

	get path() {
		return "__helios__outputdatum__inline";
	}
}

class RawDataType extends BuiltinType {
	toString() {
		return "Data";
	}

	get path() {
		return "__helios__data";
	}
}

/**
 * Builtin TxOutputId type
 */
class TxOutputIdType extends BuiltinType {
	toString() {
		return "TxOutputId";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "new":
				return Value.new(new FuncType([new TxIdType(), new IntType()], new TxOutputIdType()));
			default:
				return super.getTypeMember(name);
		}
	}

	get path() {
		return "__helios__txoutputid";
	}
}

/**
 * Buitin Address type
 */
class AddressType extends BuiltinType {
	toString() {
		return "Address";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "new":
				return Value.new(new FuncType([
					new CredentialType(), // 0
					new OptionType(new StakingCredentialType()), // 1
				], this));
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "credential":
				return Value.new(new CredentialType());
			case "staking_credential":
				return Value.new(new OptionType(new StakingCredentialType()));
			default:
				return super.getInstanceMember(name);
		}
	}

	get path() {
		return "__helios__address";
	}
}

/**
 * Builtin Credential type
 */
class CredentialType extends BuiltinType {
	toString() {
		return "Credential";
	}

	/**
	 * @param {Site} site 
	 * @param {Type} type 
	 * @returns {boolean}
	 */
	isBaseOf(site, type) {
		let b = super.isBaseOf(site, type) ||
				(new CredentialPubKeyType()).isBaseOf(site, type) || 
				(new CredentialValidatorType()).isBaseOf(site, type); 

		return b;
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "PubKey":
				return new CredentialPubKeyType();
			case "Validator":
				return new CredentialValidatorType();
			case "new_pubkey":
				return Value.new(new FuncType([new PubKeyHashType()], new CredentialPubKeyType()));
			case "new_validator":
				return Value.new(new FuncType([new ValidatorHashType()], new CredentialValidatorType()));
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	nEnumMembers(site) {
		return 2;
	}

	get path() {
		return "__helios__credential";
	}
}

/**
 * Builtin Credential::PubKey
 */
class CredentialPubKeyType extends BuiltinEnumMember {
	constructor() {
		super(new CredentialType());
	}

	toString() {
		return "Credential::PubKey";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "from_data":
				throw name.referenceError(`'${this.toString()}::from_data' undefined`);
			default:
				return super.getTypeMember(name);
		}
	}
	
	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__eq":
			case "__neq":
				return Value.new(new FuncType([new CredentialType()], new BoolType()));
			case "hash":
				return Value.new(new PubKeyHashType());
			default:
				return super.getInstanceMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		return 0;
	}

	get path() {
		return "__helios__credential__pubkey";
	}
}

/**
 * Builtin Credential::Validator type
 */
class CredentialValidatorType extends BuiltinEnumMember {
	constructor() {
		super(new CredentialType());
	}

	toString() {
		return "Credential::Validator";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "from_data":
				throw name.referenceError(`'${this.toString()}::from_data' undefined`);
			default:
				return super.getTypeMember(name);
		}
	}
	
	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__eq":
			case "__neq":
				return Value.new(new FuncType([new CredentialType()], new BoolType()));
			case "hash":
				return Value.new(new ValidatorHashType());
			default:
				return super.getInstanceMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		return 1;
	}

	get path() {
		return "__helios__credential__validator";
	}
}

/**
 * Builtin StakingCredential type
 */
class StakingCredentialType extends BuiltinType {
	toString() {
		return "StakingCredential";
	}

	/**
	 * @param {Site} site 
	 * @param {Type} type 
	 * @returns {boolean}
	 */
	isBaseOf(site, type) {
		let b = super.isBaseOf(site, type) ||
				(new StakingHashCredentialType()).isBaseOf(site, type) || 
				(new StakingPtrCredentialType()).isBaseOf(site, type); 

		return b;
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "Hash":
				return new StakingHashCredentialType();
			case "Ptr":
				return new StakingPtrCredentialType();
			case "new_hash":
				return Value.new(new FuncType([new CredentialType()], new StakingHashCredentialType()));
			case "new_ptr":
				return Value.new(new FuncType([new IntType(), new IntType(), new IntType()], new StakingPtrCredentialType()));
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
 	nEnumMembers(site) {
		return 2;
	}

	get path() {
		return "__helios__stakingcredential";
	}
}

/**
 * Builtin StakingCredential::Hash
 */
 class StakingHashCredentialType extends BuiltinEnumMember {
	constructor() {
		super(new StakingCredentialType());
	}

	toString() {
		return "StakingCredential::Hash";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "from_data":
				throw name.referenceError(`'${this.toString()}::from_data' undefined`);
			default:
				return super.getTypeMember(name);
		}
	}
	
	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__eq":
			case "__neq":
				return Value.new(new FuncType([new StakingCredentialType()], new BoolType()));
			default:
				return super.getInstanceMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		return 0;
	}

	get path() {
		return "__helios__stakingcredential__hash";
	}
}

/**
 * Builtin StakingCredential::Ptr
 */
 class StakingPtrCredentialType extends BuiltinEnumMember {
	constructor() {
		super(new StakingCredentialType());
	}

	toString() {
		return "StakingCredential::Ptr";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "from_data":
				throw name.referenceError(`'${this.toString()}::from_data' undefined`);
			default:
				return super.getTypeMember(name);
		}
	}
	
	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__eq":
			case "__neq":
				return Value.new(new FuncType([new StakingCredentialType()], new BoolType()));
			default:
				return super.getInstanceMember(name);
		}
	}

	/**
	 * @param {Site} site 
	 * @returns {number}
	 */
	getConstrIndex(site) {
		return 1;
	}

	get path() {
		return "__helios__stakingcredential__ptr";
	}
}

/**
 * Builtin Time type. Opaque alias of Int representing milliseconds since 1970
 */
class TimeType extends BuiltinType {
	toString() {
		return "Time";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "new":
				return Value.new(new FuncType([new IntType()], this));
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__add":
				return Value.new(new FuncType([new DurationType()], new TimeType()));
			case "__sub":
				return Value.new(new FuncType([new TimeType()], new DurationType()));
			case "__geq":
			case "__gt":
			case "__leq":
			case "__lt":
				return Value.new(new FuncType([new TimeType()], new BoolType()));
			case "show":
				return Value.new(new FuncType([], new StringType()));
			default:
				return super.getInstanceMember(name);
		}
	}

	get path() {
		return "__helios__time";
	}
}

/**
 * Builtin Duration type
 */
class DurationType extends BuiltinType {
	toString() {
		return "Duration";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "new":
				return Value.new(new FuncType([new IntType()], this));
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__add":
			case "__sub":
			case "__mod":
				return Value.new(new FuncType([new DurationType()], new DurationType()));
			case "__mul":
			case "__div":
				return Value.new(new FuncType([new IntType()], new DurationType()));
			case "__geq":
			case "__gt":
			case "__leq":
			case "__lt":
				return Value.new(new FuncType([new DurationType()], new BoolType()));
			default:
				return super.getInstanceMember(name);
		}
	}

	get path() {
		return "__helios__duration";
	}
}

/**
 * Builtin TimeRange type
 */
class TimeRangeType extends BuiltinType {
	toString() {
		return "TimeRange";
	}
	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
 	getTypeMember(name) {
		switch (name.value) {
			case "new":
				return Value.new(new FuncType([new TimeType(), new TimeType()], new TimeRangeType()));
			case "ALWAYS":
				return Value.new(new TimeRangeType());
			case "NEVER":
				return Value.new(new TimeRangeType());
			case "from":
				return Value.new(new FuncType([new TimeType()], new TimeRangeType()));
			case "to":
				return Value.new(new FuncType([new TimeType()], new TimeRangeType()));
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "is_before": // is_before condition never overlaps with contains
			case "is_after": // is_after condition never overlaps with contains
			case "contains":
				return Value.new(new FuncType([new TimeType()], new BoolType()));
			case "get_start":
				return Value.new(new FuncType([], new TimeType()));
			default:
				return super.getInstanceMember(name);
		}
	}

	get path() {
		return "__helios__timerange";
	}
}

/**
 * Builtin AssetClass type
 */
class AssetClassType extends BuiltinType {
	toString() {
		return "AssetClass";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "ADA":
				return Value.new(new AssetClassType());
			case "new":
				return Value.new(new FuncType([new MintingPolicyHashType(), new ByteArrayType()], new AssetClassType()));
			default:
				return super.getTypeMember(name);
		}
	}

	get path() {
		return "__helios__assetclass";
	}
}

/**
 * Builtin (Money)Value type
 * Named MoneyValue here to avoid confusion with the Value class
 */
class MoneyValueType extends BuiltinType {
	toString() {
		return "Value";
	}

	/**
	 * @param {Word} name 
	 * @returns {GeneralizedValue}
	 */
	getTypeMember(name) {
		switch (name.value) {
			case "ZERO":
				return Value.new(new MoneyValueType());
			case "lovelace":
				return Value.new(new FuncType([new IntType()], new MoneyValueType()));
			case "new":
				return Value.new(new FuncType([new AssetClassType(), new IntType()], new MoneyValueType()));
			default:
				return super.getTypeMember(name);
		}
	}

	/**
	 * @param {Word} name 
	 * @returns {Value}
	 */
	getInstanceMember(name) {
		switch (name.value) {
			case "__add":
			case "__sub":
				return Value.new(new FuncType([new MoneyValueType()], new MoneyValueType()));
			case "__mul":
			case "__div":
				return Value.new(new FuncType([new IntType()], new MoneyValueType()));
			case "__geq":
			case "__gt":
			case "__leq":
			case "__lt":
			case "contains":
				return Value.new(new FuncType([new MoneyValueType()], new BoolType()));
			case "is_zero":
				return Value.new(new FuncType([], new BoolType()));
			case "get":
				return Value.new(new FuncType([new AssetClassType()], new IntType()));
			case "get_policy":
				return Value.new(new FuncType([new MintingPolicyHashType()], new MapType(new ByteArrayType(), new IntType())));
			default:
				return super.getInstanceMember(name);
		}
	}

	get path() {
		return "__helios__value";
	}
}


//////////////////////////////////////////
// Section 14: Builtin low-level functions
//////////////////////////////////////////

/**
 * For collecting test coverage statistics
 * @type {?((name: string, count: number) => void)}
 */
var onNotifyRawUsage = null;

/**
 * Set the statistics collector (used by the test-suite)
 * @param {(name: string, count: number) => void} callback 
 */
function setRawUsageNotifier(callback) {
	onNotifyRawUsage = callback;
}

/**
 * Wrapper for a builtin function (written in IR)
 */
class RawFunc {
	#name;
	#definition;

	/** @type {Set<string>} */
	#dependencies;

	/**
	 * Construct a RawFunc, and immediately scan the definition for dependencies
	 * @param {string} name 
	 * @param {string} definition 
	 */
	constructor(name, definition) {
		this.#name = name;
		assert(definition != undefined);
		this.#definition = definition;
		this.#dependencies = new Set();

		let re = new RegExp("__helios__[a-zA-Z_0-9]*", "g");

		let matches = this.#definition.match(re);

		if (matches !== null) {
			for (let match of matches) {
				this.#dependencies.add(match);
			}
		}
	}

	get name() {
		return this.#name;
	}

	/**
	 * Loads 'this.#dependecies' (if not already loaded), then load 'this'
	 * @param {Map<string, RawFunc>} db 
	 * @param {Map<string, IR>} dst 
	 * @returns {void}
	 */
	load(db, dst) {
		if (onNotifyRawUsage !== null) {
			onNotifyRawUsage(this.#name, 1);
		}

		if (dst.has(this.#name)) {
			return;
		} else {
			for (let dep of this.#dependencies) {
				if (!db.has(dep)) {
					throw new Error(`InternalError: dependency ${dep} is not a builtin`);
				} else {
					assertDefined(db.get(dep)).load(db, dst);
				}
			}

			dst.set(this.#name, new IR(replaceTabs(this.#definition)));
		}
	}
}

/**
 * Initializes the db containing all the builtin functions
 * @returns {Map<string, RawFunc>}
 */
// only need to wrap these source in IR right at the very end
function makeRawFunctions() {
	/** @type {Map<string, RawFunc>} */
	let db = new Map();

	// local utility functions

	/**
	 * @param {RawFunc} fn 
	 */
	function add(fn) {
		if (db.has(fn.name)) {
			throw new Error(`builtin ${fn.name} duplicate`);
		}
		db.set(fn.name, fn);
	}

	/**
	 * Adds basic auto members to a fully named type
	 * @param {string} ns 
	 */
	function addDataFuncs(ns) {
		add(new RawFunc(`${ns}____eq`, "__helios__common____eq"));
		add(new RawFunc(`${ns}____neq`, "__helios__common____neq"));
		add(new RawFunc(`${ns}__serialize`, "__helios__common__serialize"));
		add(new RawFunc(`${ns}__from_data`, "__helios__common__identity"));
	}

	/**
	 * Adds basic auto members to a fully named enum type
	 * @param {string} ns 
	 */
	function addEnumDataFuncs(ns) {
		add(new RawFunc(`${ns}____eq`, "__helios__common____eq"));
		add(new RawFunc(`${ns}____neq`, "__helios__common____neq"));
		add(new RawFunc(`${ns}__serialize`, "__helios__common__serialize"));
	}

	/**
	 * Generates the IR needed to unwrap a PlutusCore constrData
	 * @param {string} dataExpr
	 * @param {number} iConstr 
	 * @param {number} iField 
	 * @param {string} errorExpr 
	 * @returns {string}
	 */
	function unData(dataExpr, iConstr, iField, errorExpr = "__core__error(\"unexpected constructor index\")") {
		let inner = "__core__sndPair(pair)";
		for (let i = 0; i < iField; i++) {
			inner = `__core__tailList(${inner})`;
		}

		// deferred evaluation of ifThenElse branches
		return `(pair) -> {__core__ifThenElse(__core__equalsInteger(__core__fstPair(pair), ${iConstr}), () -> {__core__headList(${inner})}, () -> {${errorExpr}})()}(__core__unConstrData(${dataExpr}))`;
	}

	/**
	 * Generates verbose IR for unwrapping a PlutusCore constrData.
	 * If DEBUG === false then returns IR without print statement
	 * @param {string} dataExpr
	 * @param {string} constrName
	 * @param {number} iConstr
	 * @param {number} iField
	 * @returns {string}
	 */
	function unDataVerbose(dataExpr, constrName, iConstr, iField) {
		if (!DEBUG) {
			return unData(dataExpr, iConstr, iField);
		} else {
			return unData(dataExpr, iConstr, iField, `__helios__common__verbose_error(__core__appendString("bad constr for ${constrName}, want ${iConstr.toString()} but got ", __helios__int__show(__core__fstPair(pair))()))`)
		}
	}

	/**
	 * Generates IR for constructing a list.
	 * By default the result is kept as list, and not converted to data
	 * @param {string[]} args 
	 * @param {boolean} toData 
	 * @returns 
	 */
	function makeList(args, toData = false) {
		let n = args.length;
		let inner = "__core__mkNilData(())";

		for (let i = n - 1; i >= 0; i--) {
			inner = `__core__mkCons(${args[i]}, ${inner})`;
		}

		if (toData) {
			inner = `__core__listData(${inner})`
		}

		return inner;
	}


	// Common builtins
	add(new RawFunc("__helios__common__verbose_error",
	`(msg) -> {
		__core__trace(msg, () -> {__core__error("")})()
	}`));
	add(new RawFunc("__helios__common__assert_constr_index",
	`(data, i) -> {
		__core__ifThenElse(
			__core__equalsInteger(__core__fstPair(__core__unConstrData(data)), i),
			() -> {data},
			() -> {__core__error("unexpected constructor index")}
		)()
	}`));
	add(new RawFunc("__helios__common____identity",
	`(self) -> {
		() -> {
			self
		}
	}`))
	add(new RawFunc("__helios__common__identity",
	`(self) -> {self}`));
	add(new RawFunc("__helios__common__not",
	`(b) -> {
		__core__ifThenElse(b, false, true)
	}`));
	add(new RawFunc("__helios__common____eq",
	`(self) -> {
		(other) -> {
			__core__equalsData(self, other)
		}
	}`));
	add(new RawFunc("__helios__common____neq",
	`(self) -> {
		(other) -> {
			__helios__common__not(__core__equalsData(self, other))
		}
	}`));
	add(new RawFunc("__helios__common__serialize",
	`(self) -> {
		() -> {
			__core__bData(__core__serialiseData(self))
		}
	}`));
	add(new RawFunc("__helios__common__any",
	`(self, fn) -> {
		(recurse) -> {
			recurse(recurse, self, fn)
		}(
			(recurse, self, fn) -> {
				__core__ifThenElse(
					__core__nullList(self), 
					() -> {false}, 
					() -> {
						__core__ifThenElse(
							fn(__core__headList(self)),
							() -> {true}, 
							() -> {recurse(recurse, __core__tailList(self), fn)}
						)()
					}
				)()
			}
		)
	}`));
	add(new RawFunc("__helios__common__all", 
	`(self, fn) -> {
		(recurse) -> {
			recurse(recurse, self, fn)
		}(
			(recurse, self, fn) -> {
				__core__ifThenElse(
					__core__nullList(self),
					() -> {true},
					() -> {
						__core__ifThenElse(
							fn(__core__headList(self)),
							() -> {recurse(recurse, __core__tailList(self), fn)},
							() -> {false}
						)()
					}
				)()
			}
		)
	}`));
	add(new RawFunc("__helios__common__map",
	`(self, fn) -> {
		(recurse) -> {
			__core__listData(recurse(recurse, self, __core__mkNilData(())))
		}(
			(recurse, rem, lst) -> {
				__core__ifThenElse(
					__core__nullList(rem),
					() -> {lst},
					() -> {
						__core__mkCons(
							fn(__core__headList(rem)), 
							recurse(recurse, __core__tailList(rem), lst)
						)
					}
				)()
			}
		)
	}`));
	add(new RawFunc("__helios__common__filter", 
	`(self, fn, nil) -> {
		(recurse) -> {
			recurse(recurse, self, fn)
		}(
			(recurse, self, fn) -> {
				__core__ifThenElse(
					__core__nullList(self), 
					() -> {nil}, 
					() -> {
						__core__ifThenElse(
							fn(__core__headList(self)),
							() -> {__core__mkCons(__core__headList(self), recurse(recurse, __core__tailList(self), fn))}, 
							() -> {recurse(recurse, __core__tailList(self), fn)}
						)()
					}
				)()
			}
		)
	}`));
	add(new RawFunc("__helios__common__filter_list", 
	`(self, fn) -> {
		__helios__common__filter(self, fn, __helios__common__list_0)
	}`));
	add(new RawFunc("__helios__common__filter_map",
	`(self, fn) -> {
		__helios__common__filter(self, fn, __core__mkNilPairData(()))
	}`));
	add(new RawFunc("__helios__common__find",
	`(self, fn) -> {
		(recurse) -> {
			recurse(recurse, self, fn)
		}(
			(recurse, self, fn) -> {
				__core__ifThenElse(
					__core__nullList(self), 
					() -> {__core__error("not found")}, 
					() -> {
						__core__ifThenElse(
							fn(__core__headList(self)), 
							() -> {__core__headList(self)}, 
							() -> {recurse(recurse, __core__tailList(self), fn)}
						)()
					}
				)()
			}
		)
	}`));
	add(new RawFunc("__helios__common__fold",
	`(self, fn, z) -> {
		(recurse) -> {
			recurse(recurse, self, fn, z)
		}(
			(recurse, self, fn, z) -> {
				__core__ifThenElse(
					__core__nullList(self), 
					() -> {z}, 
					() -> {recurse(recurse, __core__tailList(self), fn, fn(z, __core__headList(self)))}
				)()
			}
		)
	}`));
	add(new RawFunc("__helios__common__map_get",
	`(self, key, fnFound, fnNotFound) -> {
		(self) -> {
			(recurse) -> {
				recurse(recurse, self, key)
			}(
				(recurse, self, key) -> {
					__core__ifThenElse(
						__core__nullList(self), 
						fnNotFound, 
						() -> {
							__core__ifThenElse(
								__core__equalsData(key, __core__fstPair(__core__headList(self))), 
								() -> {fnFound(__core__sndPair(__core__headList(self)))}, 
								() -> {recurse(recurse, __core__tailList(self), key)}
							)()
						}
					)()
				}
			)
		}(__core__unMapData(self))
	}`));
	add(new RawFunc("__helios__common__is_in_bytearray_list",
	`(lst, key) -> {
		__helios__common__any(lst, (item) -> {__core__equalsData(item, key)})
	}`));
	add(new RawFunc("__helios__common__unBoolData",
	`(d) -> {
		__core__ifThenElse(
			__core__equalsInteger(__core__fstPair(__core__unConstrData(d)), 0), 
			false, 
			true
		)
	}`));
	add(new RawFunc("__helios__common__boolData",
	`(b) -> {
		__core__constrData(__core__ifThenElse(b, 1, 0), __helios__common__list_0)
	}`));
	add(new RawFunc("__helios__common__unStringData",
	`(d) -> {
		__core__decodeUtf8(__core__unBData(d))
	}`));
	add(new RawFunc("__helios__common__stringData",
	`(s) -> {
		__core__bData(__core__encodeUtf8(s))
	}`));
	add(new RawFunc("__helios__common__length", 
	`(lst) -> {
		(recurse) -> {
			__core__iData(recurse(recurse, lst))
		}(
			(recurse, lst) -> {
				__core__ifThenElse(
					__core__nullList(lst), 
					() -> {0}, 
					() -> {__core__addInteger(recurse(recurse, __core__tailList(lst)), 1)}
				)()
			}
		)
	}`));
	add(new RawFunc("__helios__common__max",
	`(a, b) -> {
		__core__ifThenElse(
			__core__lessThanInteger(a, b),
			b,
			a
		)
	}`));
	add(new RawFunc("__helios__common__min", 
	`(a, b) -> {
		__core__ifThenElse(
			__core__lessThanEqualsInteger(a, b),
			a,
			b
		)
	}`));
	add(new RawFunc("__helios__common__concat", 
	`(a, b) -> {
		(recurse) -> {
			recurse(recurse, b, a)
		}(
			(recurse, lst, rem) -> {
				__core__ifThenElse(
					__core__nullList(rem),
					() -> {lst},
					() -> {__core__mkCons(__core__headList(rem), recurse(recurse, lst, __core__tailList(rem)))}
				)()
			}
		)
	}`));
	add(new RawFunc("__helios__common__slice_bytearray",
	`(self, selfLengthFn) -> {
		(start, end) -> {
			(self) -> {
				(start, end) -> {
					(normalize) -> {
						__core__bData(
							(fn) -> {
								fn(normalize(start))
							}(
								(start) -> {
									(fn) -> {
										fn(normalize(end))
									}(
										(end) -> {
											__core__sliceByteString(start, __core__subtractInteger(end, __helios__common__max(start, 0)), self)
										}
									)
								}
							)
						)
					}(
						(pos) -> {
							__core__ifThenElse(
								__core__lessThanInteger(pos, 0),
								() -> {
									__core__addInteger(__core__addInteger(selfLengthFn(self), 1), pos)
								},
								() -> {
									pos
								}
							)()
						}
					)
				}(__core__unIData(start), __core__unIData(end))
			}(__core__unBData(self))
		}
	}`));
	add(new RawFunc("__helios__common__starts_with", 
	`(self, selfLengthFn) -> {
		(self) -> {
			(prefix) -> {
				(prefix) -> {
					(n, m) -> {
						__core__ifThenElse(
							__core__lessThanInteger(n, m),
							() -> {false},
							() -> {
								__core__equalsByteString(prefix, __core__sliceByteString(0, m, self))
							}
						)()
					}(selfLengthFn(self), __core__lengthOfByteString(prefix))
				}(__core__unBData(prefix))
			}
		}(__core__unBData(self))
	}`));
	add(new RawFunc("__helios__common__ends_with",
	`(self, selfLengthFn) -> {
		(self) -> {
			(suffix) -> {
				(suffix) -> {
					(n, m) -> {
						__core__ifThenElse(
							__core__lessThanInteger(n, m),
							() -> {false},
							() -> {
								__core__equalsByteString(suffix, __core__sliceByteString(__core__subtractInteger(n, m), m, self))
							}
						)()
					}(selfLengthFn(self), __core__lengthOfByteString(suffix))
				}(__core__unBData(suffix))
			}
		}(__core__unBData(self))
	}`));
	add(new RawFunc("__helios__common__fields", 
	`(self) -> {
		__core__sndPair(__core__unConstrData(self))
	}`));
	add(new RawFunc("__helios__common__field_0", 
	`(self) -> {
		__core__headList(__helios__common__fields(self))
	}`));
	add(new RawFunc("__helios__common__fields_after_0",
	`(self) -> {
		__core__tailList(__helios__common__fields(self))
	}`));
	for (let i = 1; i < 20; i++) {
		add(new RawFunc(`__helios__common__field_${i.toString()}`,
	`(self) -> {
		__core__headList(__helios__common__fields_after_${(i-1).toString()}(self))
	}`));
		add(new RawFunc(`__helios__common__fields_after_${i.toString()}`,
	`(self) -> {
		__core__tailList(__helios__common__fields_after_${(i-1).toString()}(self))
	}`));
	}
	add(new RawFunc("__helios__common__list_0", "__core__mkNilData(())"));
	add(new RawFunc("__helios__common__list_1", 
	`(a) -> {
		__core__mkCons(a, __helios__common__list_0)
	}`));
	for (let i = 2; i < 20; i++) {
		/**
		 * @type {string[]}
		 */
		let args = [];

		for (let j = 0; j < i; j++) {
			args.push(`arg${j.toString()}`);
		}

		let woFirst = args.slice()
		let first = assertDefined(woFirst.shift());

		add(new RawFunc(`__helios__common__list_${i.toString()}`,
	`(${args.join(", ")}) -> {
		__core__mkCons(${first}, __helios__common__list_${(i-1).toString()}(${woFirst.join(", ")}))
	}`));
	}


	// Int builtins
	addDataFuncs("__helios__int");
	add(new RawFunc("__helios__int____neg",
	`(self) -> {
		(self) -> {
			() -> {
				__core__iData(__core__multiplyInteger(self, -1))
			}
		}(__core__unIData(self))
	}`));
	add(new RawFunc("__helios__int____pos", "__helios__common____identity"));
	add(new RawFunc("__helios__int____add",
	`(self) -> {
		(a) -> {
			(b) -> {
				__core__iData(__core__addInteger(a, __core__unIData(b)))
			}
		}(__core__unIData(self))
	}`));
	add(new RawFunc("__helios__int____sub",
	`(self) -> {
		(a) -> {
			(b) -> {
				__core__iData(__core__subtractInteger(a, __core__unIData(b)))
			}
		}(__core__unIData(self))
	}`));
	add(new RawFunc("__helios__int____mul",
	`(self) -> {
		(a) -> {
			(b) -> {
				__core__iData(__core__multiplyInteger(a, __core__unIData(b)))
			}
		}(__core__unIData(self))
	}`));
	add(new RawFunc("__helios__int____div",
	`(self) -> {
		(a) -> {
			(b) -> {
				__core__iData(__core__divideInteger(a, __core__unIData(b)))
			}
		}(__core__unIData(self))
	}`));
	add(new RawFunc("__helios__int____mod",
	`(self) -> {
		(a) -> {
			(b) -> {
				__core__iData(__core__modInteger(a, __core__unIData(b)))
			}
		}(__core__unIData(self))
	}`));
	add(new RawFunc("__helios__int____geq",
	`(self) -> {
		(a) -> {
			(b) -> {
				__helios__common__not(__core__lessThanInteger(a, __core__unIData(b)))
			}
		}(__core__unIData(self))
	}`));
	add(new RawFunc("__helios__int____gt",
	`(self) -> {
		(a) -> {
			(b) -> {
				__helios__common__not(__core__lessThanEqualsInteger(a, __core__unIData(b)))
			}
		}(__core__unIData(self))
	}`));
	add(new RawFunc("__helios__int____leq",
	`(self) -> {
		(a) -> {
			(b) -> {
				__core__lessThanEqualsInteger(a, __core__unIData(b))
			}
		}(__core__unIData(self))
	}`));
	add(new RawFunc("__helios__int____lt",
	`(self) -> {
		(a) -> {
			(b) -> {
				__core__lessThanInteger(a, __core__unIData(b))
			}
		}(__core__unIData(self))
	}`));
	add(new RawFunc("__helios__int__to_bool",
	`(self) -> {
		(self) -> {
			() -> {
				__core__ifThenElse(__core__equalsInteger(self, 0), false, true)
			}
		}(__core__unIData(self))
	}`));
	add(new RawFunc("__helios__int__to_hex",
	`(self) -> {
		(self) -> {
			() -> {
				(recurse) -> {
					__core__bData(
						__core__ifThenElse(
							__core__lessThanInteger(self, 0),
							() -> {__core__consByteString(45, recurse(recurse, __core__multiplyInteger(self, -1)))},
							() -> {recurse(recurse, self)}
						)()
					)
				}(
					(recurse, self) -> {
						(partial) -> {
							(bytes) -> {
								__core__ifThenElse(
									__core__lessThanInteger(self, 16),
									() -> {bytes},
									() -> {__core__appendByteString(recurse(recurse, __core__divideInteger(self, 16)), bytes)}
								)()
							}(
								__core__consByteString(
									__core__ifThenElse(
										__core__lessThanInteger(partial, 10), 
										__core__addInteger(partial, 48), 
										__core__addInteger(partial, 87)
									), 
									#
								)
							)
						}(__core__modInteger(self, 16))
					}
				)
			}
		}(__core__unIData(self))
	}`));
	add(new RawFunc("__helios__int__show",
	`(self) -> {
		(self) -> {
			() -> {
				__helios__common__stringData(__core__decodeUtf8(
					(recurse) -> {
						__core__ifThenElse(
							__core__lessThanInteger(self, 0),
							() -> {__core__consByteString(45, recurse(recurse, __core__multiplyInteger(self, -1)))},
							() -> {recurse(recurse, self)}
						)()
					}(
						(recurse, i) -> {
							(bytes) -> {
								__core__ifThenElse(
									__core__lessThanInteger(i, 10),
									() -> {bytes},
									() -> {__core__appendByteString(recurse(recurse, __core__divideInteger(i, 10)), bytes)}
								)()
							}(__core__consByteString(__core__addInteger(__core__modInteger(i, 10), 48), #))
						}
					)
				))
			}
		}(__core__unIData(self))
	}`));


	// Bool builtins
	add(new RawFunc(`__helios__bool____eq`, 
	`(a) -> {
		(b) -> {
			__core__ifThenElse(a, b, __helios__common__not(b))
		}
	}`));
	add(new RawFunc(`__helios__bool____neq`,
	`(a) -> {
		(b) -> {
			__core__ifThenElse(a, __helios__common__not(b), b)
		}
	}`));
	add(new RawFunc(`__helios__bool__serialize`, 
	`(self) -> {
		__helios__common__serialize(__helios__common__boolData(self))
	}`));
	add(new RawFunc(`__helios__bool__from_data`,
	`(data) -> {
		__helios__common__unBoolData(data)
	}`));
	add(new RawFunc("__helios__bool__and",
	`(a, b) -> {
		__core__ifThenElse(
			a(), 
			() -> {b()}, 
			() -> {false}
		)()
	}`));
	add(new RawFunc("__helios__bool__or",
	`(a, b) -> {
		__core__ifThenElse(
			a(), 
			() -> {true},
			() -> {b()}
		)()
	}`));
	add(new RawFunc("__helios__bool____not",
	`(self) -> {
		() -> {
			__helios__common__not(self)
		}
	}`));
	add(new RawFunc("__helios__bool__to_int",
	`(self) -> {
		() -> {
			__core__iData(__core__ifThenElse(self, 1, 0))
		}
	}`));
	add(new RawFunc("__helios__bool__show",
	`(self) -> {
		() -> {
			__helios__common__stringData(__core__ifThenElse(self, "true", "false"))
		}
	}`));


	// String builtins
	addDataFuncs("__helios__string");
	add(new RawFunc("__helios__string____add",
	`(self) -> {
		(self) -> {
			(other) -> {
				__helios__common__stringData(__core__appendString(self, __helios__common__unStringData(other)))
			}
		}(__helios__common__unStringData(self))
	}`));
	add(new RawFunc("__helios__string__starts_with", "__helios__bytearray__starts_with"));
	add(new RawFunc("__helios__string__ends_with", "__helios__bytearray__ends_with"));
	add(new RawFunc("__helios__string__encode_utf8",
	`(self) -> {
		(self) -> {
			() -> {
				__core__bData(__core__encodeUtf8(self))
			}
		}(__helios__common__unStringData(self))
	}`));


	// ByteArray builtins
	addDataFuncs("__helios__bytearray");
	add(new RawFunc("__helios__bytearray____add",
	`(self) -> {
		(a) -> {
			(b) -> {
				__core__bData(__core__appendByteString(a, __core__unBData(b)))
			}
		}(__core__unBData(self))
	}`));
	add(new RawFunc("__helios__bytearray__length",
	`(self) -> {
		__core__iData(__core__lengthOfByteString(__core__unBData(self)))
	}`));
	add(new RawFunc("__helios__bytearray__slice",
	`(self) -> {
		__helios__common__slice_bytearray(self, __core__lengthOfByteString)
	}`));
	add(new RawFunc("__helios__bytearray__starts_with", 
	`(self) -> {
		__helios__common__starts_with(self, __core__lengthOfByteString)
	}`));
	add(new RawFunc("__helios__bytearray__ends_with",
	`(self) -> {
		__helios__common__ends_with(self, __core__lengthOfByteString)
	}`));
	add(new RawFunc("__helios__bytearray__sha2",
	`(self) -> {
		(self) -> {
			() -> {
				__core__bData(__core__sha2_256(self))
			}
		}(__core__unBData(self))
	}`));
	add(new RawFunc("__helios__bytearray__sha3",
	`(self) -> {
		(self) -> {
			() -> {
				__core__bData(__core__sha3_256(self))
			}
		}(__core__unBData(self))
	}`));
	add(new RawFunc("__helios__bytearray__blake2b",
	`(self) -> {
		(self) -> {
			() -> {
				__core__bData(__core__blake2b_256(self))
			}
		}(__core__unBData(self))
	}`));
	add(new RawFunc("__helios__bytearray__decode_utf8",
	`(self) -> {
		(self) -> {
			() -> {
				__helios__common__stringData(__core__decodeUtf8(self))
			}
		}(__core__unBData(self))
	}`));
	add(new RawFunc("__helios__bytearray__show",
	`(self) -> {
		(self) -> {
			() -> {
				(recurse) -> {
					__helios__common__stringData(recurse(recurse, self))
				}(
					(recurse, self) -> {
						(n) -> {
							__core__ifThenElse(
								__core__lessThanInteger(0, n),
								() -> {
									__core__appendString(
										__core__decodeUtf8((hexBytes) -> {
											__core__ifThenElse(
												__core__equalsInteger(__core__lengthOfByteString(hexBytes), 1),
												__core__consByteString(48, hexBytes),
												hexBytes
											)
										}(__core__unBData(__helios__int__to_hex(__core__iData(__core__indexByteString(self, 0)))()))), 
										recurse(recurse, __core__sliceByteString(1, n, self))
									)
								},
								() -> {
									""
								}
							)()
						}(__core__lengthOfByteString(self))
					}
				)
			}
		}(__core__unBData(self))
	}`));
	add(new RawFunc("__helios__bytearray32____eq", "__helios__bytearray____eq"));
	add(new RawFunc("__helios__bytearray32____neq", "__helios__bytearray____neq"));
	add(new RawFunc("__helios__bytearray32__serialize", "__helios__bytearray__serialize"));
	add(new RawFunc("__helios__bytearray32____add", "__helios__bytearray____add"));
	add(new RawFunc("__helios__bytearray32__length", "(_) -> {__core__iData(32)}"));
	add(new RawFunc("__helios__bytearray32__slice", 
	`(self) -> {
		__helios__common__slice_bytearray(self, (self) -> {32})
	}`));
	add(new RawFunc("__helios__bytearray32__starts_with", 
	`(self) -> {
		__helios__common__starts_with(self, (self) -> {32})
	}`));
	add(new RawFunc("__helios__bytearray32__ends_with", 
	`(self) -> {
		__helios__common__ends_with(self, (self) -> {32})
	}`));
	add(new RawFunc("__helios__bytearray32__sha2", "__helios__bytearray__sha2"));
	add(new RawFunc("__helios__bytearray32__sha3", "__helios__bytearray__sha3"));
	add(new RawFunc("__helios__bytearray32__blake2b", "__helios__bytearray__blake2b"));
	add(new RawFunc("__helios__bytearray32__decode_utf8", "__helios__bytearray__decode_utf8"));
	add(new RawFunc("__helios__bytearray32__show", "__helios__bytearray__show"));


	// List builtins
	addDataFuncs("__helios__list");
	add(new RawFunc("__helios__list__new",
	`(n, fn) -> {
		(n) -> {
			(recurse) -> {
				__core__listData(recurse(recurse, 0))
			}(
				(recurse, i) -> {
					__core__ifThenElse(
						__core__lessThanInteger(i, n),
						() -> {__core__mkCons(fn(__core__iData(i)), recurse(recurse, __core__addInteger(i, 1)))},
						() -> {__core__mkNilData(())}
					)()
				}
			)
		}(__core__unIData(n))
	}`));
	add(new RawFunc("__helios__list__new_const",
	`(n, item) -> {
		__helios__list__new(n, (i) -> {item})
	}`));
	add(new RawFunc("__helios__list____add",
	`(self) -> {
		(a) -> {
			(b) -> {
				(b) -> {
					__core__listData(__helios__common__concat(a, b))
				}(__core__unListData(b))
			}
		}(__core__unListData(self))
	}`));
	add(new RawFunc("__helios__list__length",
	`(self) -> {
		__helios__common__length(__core__unListData(self))
	}`));
	add(new RawFunc("__helios__list__head",
	`(self) -> {
		__core__headList(__core__unListData(self))
	}`));
	add(new RawFunc("__helios__list__tail",
	`(self) -> {
		__core__listData(__core__tailList(__core__unListData(self)))
	}`));
	add(new RawFunc("__helios__list__is_empty",
	`(self) -> {
		(self) -> {
			() -> {
				__core__nullList(self)
			}
		}(__core__unListData(self))
	}`));
	add(new RawFunc("__helios__list__get",
	`(self) -> {
		(self) -> {
			(index) -> {
				(recurse) -> {
					recurse(recurse, self, __core__unIData(index))
				}(
					(recurse, self, index) -> {
						__core__ifThenElse(
							__core__nullList(self), 
							() -> {__core__error("index out of range")}, 
							() -> {__core__ifThenElse(
								__core__lessThanInteger(index, 0), 
								() -> {__core__error("index out of range")}, 
								() -> {
									__core__ifThenElse(
										__core__equalsInteger(index, 0), 
										() -> {__core__headList(self)}, 
										() -> {recurse(recurse, __core__tailList(self), __core__subtractInteger(index, 1))}
									)()
								}
							)()}
						)()
					}
				)
			}
		}(__core__unListData(self))
	}`));
	add(new RawFunc("__helios__list__any",
	`(self) -> {
		(self) -> {
			(fn) -> {
				__helios__common__any(self, fn)
			}
		}(__core__unListData(self))
	}`));
	add(new RawFunc("__helios__list__all",
	`(self) -> {
		(self) -> {
			(fn) -> {
				__helios__common__all(self, fn)
			}
		}(__core__unListData(self))
	}`));
	add(new RawFunc("__helios__list__prepend",
	`(self) -> {
		(self) -> {
			(item) -> {
				__core__listData(__core__mkCons(item, self))
			}
		}(__core__unListData(self))
	}`));
	add(new RawFunc("__helios__list__find",
	`(self) -> {
		(self) -> {
			(fn) -> {
				__helios__common__find(self, fn)
				
			}
		}(__core__unListData(self))
	}`));
	add(new RawFunc("__helios__list__filter",
	`(self) -> {
		(self) -> {
			(fn) -> {
				__core__listData(__helios__common__filter_list(self, fn))
			}
		}(__core__unListData(self))
	}`));
	add(new RawFunc("__helios__list__fold",
	`(self) -> {
		(self) -> {
			(fn, z) -> {
				__helios__common__fold(self, fn, z)
			}
		}(__core__unListData(self))
	}`));
	add(new RawFunc("__helios__list__map",
	`(self) -> {
		(self) -> {
			(fn) -> {
				__helios__common__map(self, fn)
			}
		}(__core__unListData(self))
	}`));
	add(new RawFunc("__helios__boollist__new", 
	`(n, fn) -> {
		__helios__list__new(
			n, 
			(i) -> {
				__helios__common__boolData(fn(i))
			}
		)
	}`));
	add(new RawFunc("__helios__boollist__new_const", 
	`(n, item) -> {
		__helios__list__new_const(n, __helios__common__boolData(item))
	}`));
	add(new RawFunc("__helios__boollist____eq", "__helios__list____eq"));
	add(new RawFunc("__helios__boollist____neq", "__helios__list____neq"));
	add(new RawFunc("__helios__boollist__serialize", "__helios__list__serialize"));
	add(new RawFunc("__helios__boollist__from_data", "__helios__list__from_data"));
	add(new RawFunc("__helios__boollist____add", "__helios__list____add"));
	add(new RawFunc("__helios__boollist__length", "__helios__list__length"));
	add(new RawFunc("__helios__boollist__head", 
	`(self) -> {
		__helios__common__unBoolData(__helios__list__head(self))
	}`));
	add(new RawFunc("__helios__boollist__tail", "__helios__list__tail"));
	add(new RawFunc("__helios__boollist__is_empty", "__helios__list__is_empty"));
	add(new RawFunc("__helios__boollist__get", 
	`(self) -> {
		(index) -> {
			__helios__common__unBoolData(__helios__list__get(self)(index))
		}
	}`));
	add(new RawFunc("__helios__boollist__any", 
	`(self) -> {
		(fn) -> {
			__helios__list__any(self)(
				(item) -> {
					fn(__helios__common__unBoolData(item))
				}
			)
		}
	}`));
	add(new RawFunc("__helios__boollist__all",
	`(self) -> {
		(fn) -> {
			__helios__list__all(self)(
				(item) -> {
					fn(__helios__common__unBoolData(item))
				}
			)
		}
	}`));
	add(new RawFunc("__helios__boollist__prepend",
	`(self) -> {
		(item) -> {
			__helios__list__prepend(self)(__helios__common__boolData(item))
		}
	}`));
	add(new RawFunc("__helios__boollist__find",
	`(self) -> {
		(fn) -> {
			__helios__common__unBoolData(
				__helios__list__find(self)(
					(item) -> {
						fn(__helios__common__unBoolData(item))
					}
				)
			)
		}
	}`));
	add(new RawFunc("__helios__boollist__filter",
	`(self) -> {
		(fn) -> {
			__helios__list__filter(self)(
				(item) -> {
					fn(__helios__common__unBoolData(item))
				}
			)
		}
	}`));
	add(new RawFunc("__helios__boollist__fold",
	`(self) -> {
		(fn, z) -> {
			__helios__list__fold(self)(
				(prev, item) -> {
					fn(prev, __helios__common__unBoolData(item))
				},
				z
			)
		}
	}`));
	add(new RawFunc("__helios__boollist__map",
	`(self) -> {
		(fn) -> {
			__helios__list__map(self)(
				(item) -> {
					fn(__helios__common__unBoolData(item))
				}
			)
		}
	}`));


	// Map builtins
	addDataFuncs("__helios__map");
	add(new RawFunc("__helios__map____add",
	`(self) -> {
		(a) -> {
			(b) -> {
				(b) -> {
					__core__mapData(__helios__common__concat(a, b))
				}(__core__unMapData(b))
			}
		}(__core__unMapData(self))
	}`));
	add(new RawFunc("__helios__map__length",
	`(self) -> {
		__helios__common__length(__core__unMapData(self))
	}`));
	add(new RawFunc("__helios__map__is_empty",
	`(self) -> {
		(self) -> {
			() -> {
				__core__nullList(self)
			}
		}(__core__unMapData(self))
	}`));
	add(new RawFunc("__helios__map__get",
	`(self) -> {
		(key) -> {
			__helios__common__map_get(self, key, (x) -> {x}, () -> {__core__error("key not found")})
		}
	}`));
	add(new RawFunc("__helios__map__get_safe",
	`(self) -> {
		(key) -> {
			__helios__common__map_get(
				self, 
				key, 
				(x) -> {
					__core__constrData(0, __helios__common__list_1(x))
				}, 
				() -> {
					__core__constrData(1, __helios__common__list_0)
				}
			)
		}
	}`));
	add(new RawFunc("__helios__map__all",
	`(self) -> {
		(self) -> {
			(fn) -> {
				(fn) -> {
					__helios__common__all(self, fn)
				}(
					(pair) -> {
						fn(__core__fstPair(pair), __core__sndPair(pair))
					}
				)
			}
		}(__core__unMapData(self))
	}`));
	add(new RawFunc("__helios__map__all_keys",
	`(self) -> {
		(self) -> {
			(fn) -> {
				(fn) -> {
					__helios__common__all(self, fn)
				}(
					(pair) -> {
						fn(__core__fstPair(pair))
					}
				)
			}
		}(__core__unMapData(self))
	}`));
	add(new RawFunc("__helios__map__all_values",
	`(self) -> {
		(self) -> {
			(fn) -> {
				(fn) -> {
					__helios__common__all(self, fn)
				}(
					(pair) -> {
						fn(__core__sndPair(pair))
					}
				)
			}
		}(__core__unMapData(self))
	}`));
	add(new RawFunc("__helios__map__any",
	`(self) -> {
		(self) -> {
			(fn) -> {
				(fn) -> {
					__helios__common__any(self, fn)
				}(
					(pair) -> {
						fn(__core__fstPair(pair), __core__sndPair(pair))
					}
				)
			}
		}(__core__unMapData(self))
	}`));
	add(new RawFunc("__helios__map__any_key",
	`(self) -> {
		(self) -> {
			(fn) -> {
				(fn) -> {
					__helios__common__any(self, fn)
				}(
					(pair) -> {
						fn(__core__fstPair(pair))
					}
				)
			}
		}(__core__unMapData(self))
	}`));
	add(new RawFunc("__helios__map__any_value",
	`(self) -> {
		(self) -> {
			(fn) -> {
				(fn) -> {
					__helios__common__any(self, fn)
				}(
					(pair) -> {
						fn(__core__sndPair(pair))
					}
				)
			}
		}(__core__unMapData(self))
	}`));
	add(new RawFunc("__helios__map__filter",
	`(self) -> {
		(self) -> {
			(fn) -> {
				(fn) -> {
					__core__mapData(__helios__common__filter_map(self, fn))
				}(
					(pair) -> {
						fn(__core__fstPair(pair), __core__sndPair(pair))
					}
				)
			}
		}(__core__unMapData(self))
	}`));
	add(new RawFunc("__helios__map__filter_by_key",
	`(self) -> {
		(self) -> {
			(fn) -> {
				(fn) -> {
					__core__mapData(__helios__common__filter_map(self, fn))
				}(
					(pair) -> {
						fn(__core__fstPair(pair))
					}
				)
			}
		}(__core__unMapData(self))
	}`));
	add(new RawFunc("__helios__map__filter_by_value",
	`(self) -> {
		(self) -> {
			(fn) -> {
				(fn) -> {
					__core__mapData(__helios__common__filter_map(self, fn))
				}(
					(pair) -> {
						fn(__core__sndPair(pair))
					}
				)
			}
		}(__core__unMapData(self))
	}`));
	add(new RawFunc("__helios__map__map",
	`(self) -> {
		(self) -> {
			(fn) -> {
				(fn) -> {
					__helios__common__map(self, fn)
				}(
					(pair) -> {
						fn(__core__fstPair(pair), __core__sndPair(pair))
					}
				)
			}
		}(__core__unMapData(self))
	}`))
	add(new RawFunc("__helios__map__fold",
	`(self) -> {
		(self) -> {
			(fn, z) -> {
				(fn) -> {
					__helios__common__fold(self, fn, z)
				}(
					(z, pair) -> {
						fn(z, __core__fstPair(pair), __core__sndPair(pair))
					}
				)
				
			}
		}(__core__unMapData(self))
	}`));
	add(new RawFunc("__helios__map__fold_keys",
	`(self) -> {
		(self) -> {
			(fn, z) -> {
				(fn) -> {
					__helios__common__fold(self, fn, z)
				}(
					(z, pair) -> {
						fn(z, __core__fstPair(pair))
					}
				)
				
			}
		}(__core__unMapData(self))
	}`));
	add(new RawFunc("__helios__map__fold_values",
	`(self) -> {
		(self) -> {
			(fn, z) -> {
				(fn) -> {
					__helios__common__fold(self, fn, z)
				}(
					(z, pair) -> {
						fn(z, __core__sndPair(pair))
					}
				)
				
			}
		}(__core__unMapData(self))
	}`));
	add(new RawFunc("__helios__boolmap____eq", "__helios__map____eq"));
	add(new RawFunc("__helios__boolmap____neq", "__helios__map____neq"));
	add(new RawFunc("__helios__boolmap__serialize", "__helios__map__serialize"));
	add(new RawFunc("__helios__boolmap__from_data", "__helios__map__from_data"));
	add(new RawFunc("__helios__boolmap____add", "__helios__map____add"));
	add(new RawFunc("__helios__boolmap__length", "__helios__map__length"));
	add(new RawFunc("__helios__boolmap__is_empty", "__helios__map__is_empty"));
	add(new RawFunc("__helios__boolmap__get", 
	`(self) -> {
		(key) -> {
			__helios__common__unBoolData(__helios__map__get(self)(key))
		}
	}`));
	add(new RawFunc("__helios__boolmap__all",
	`(self) -> {
		(fn) -> {
			__helios__map__all(self)(
				(key, value) -> {
					fn(key, __helios__common__unBoolData(value))
				}
			)
		}
	}`));
	add(new RawFunc("__helios__boolmap__all_keys", "__helios__map__all_keys"));
	add(new RawFunc("__helios__boolmap__all_values", 
	`(self) -> {
		(fn) -> {
			__helios__map__all_values(self)(
				(value) -> {
					fn(__helios__common__unBoolData(value))
				}
			)
		}
	}`));
	add(new RawFunc("__helios__boolmap__any",
	`(self) -> {
		(fn) -> {
			__helios__map__any(self)(
				(key, value) -> {
					fn(key, __helios__common__unBoolData(value))
				}
			)
		}
	}`));
	add(new RawFunc("__helios__boolmap__any_key", "__helios__map__any_key"));
	add(new RawFunc("__helios__boolmap__any_value", 
	`(self) -> {
		(fn) -> {
			__helios__map__any_value(self)(
				(value) -> {
					fn(__helios__common__unBoolData(value))
				}
			)
		}
	}`));
	add(new RawFunc("__helios__boolmap__filter",
	`(self) -> {
		(fn) -> {
			__helios__map__filter(self)(
				(key, value) -> {
					fn(key, __helios__common__unBoolData(value))
				}
			)
		}
	}`));
	add(new RawFunc("__helios__boolmap__filter_by_key", "__helios__map__filter_by_key"));
	add(new RawFunc("__helios__boolmap__filter_by_value", 
	`(self) -> {
		(fn) -> {
			__helios__map__filter_by_value(self)(
				(value) -> {
					fn(__helios__common__unBoolData(value))
				}
			)
		}
	}`));
	add(new RawFunc("__helios__boolmap__map",
	`(self) -> {
		(fn) -> {
			__helios__map__map(self)(
				(key, value) -> {
					fn(key, __helios__common__unBoolData(value))
				}
			)
		}
	}`));
	add(new RawFunc("__helios__boolmap__fold",
	`(self) -> {
		(fn, z) -> {
			__helios__map__fold(self)(
				(prev, key, value) -> {
					fn(prev, key, __helios__common__unBoolData(value))
				},
				z
			)
		}
	}`));
	add(new RawFunc("__helios__boolmap__fold_keys", "__helios__map__fold_keys"));
	add(new RawFunc("__helios__boolmap__fold_values", 
	`(self) -> {
		(fn, z) -> {
			__helios__map__fold_values(self)(
				(prev, value) -> {
					fn(prev, __helios__common__unBoolData(value))
				},
				z
			)
		}
	}`));


	// Option builtins
	addDataFuncs("__helios__option");
	addEnumDataFuncs("__helios__option__some");
	add(new RawFunc("__helios__option__some__new",
	`(data) -> {
		__core__constrData(0, __helios__common__list_1(data))
	}`));
	add(new RawFunc("__helios__option__some__cast",
	`(data) -> {
		__helios__common__assert_constr_index(data, 0)
	}`));
	add(new RawFunc("__helios__option__some__some", "__helios__common__field_0"));
	add(new RawFunc("__helios__option__boolsome____eq", "__helios__option__some____eq"));
	add(new RawFunc("__helios__option__boolsome____neq", "__helios__option__some____neq"));
	add(new RawFunc("__helios__option__boolsome__serialize", "__helios__option__some__serialize"));
	add(new RawFunc("__helios__option__boolsome__new", 
	`(b) -> {
		__helios__option__some__new(__helios__common__boolData(b))
	}`));
	add(new RawFunc("__helios__option__boolsome__cast", "__helios__option__some__cast"));
	add(new RawFunc("__helios__option__boolsome__some", 
	`(self) -> {
		__helios__common__unBoolData(__helios__option__some__some(self))
	}`));
	addEnumDataFuncs("__helios__option__none");
	add(new RawFunc("__helios__option__none__new",
	`() -> {
		__core__constrData(1, __helios__common__list_0)
	}`));
	add(new RawFunc("__helios__option__none__cast",
	`(data) -> {
		__helios__common__assert_constr_index(data, 1)
	}`));


	// Hash builtins
	addDataFuncs("__helios__hash");
	add(new RawFunc("__helios__hash__new", `__helios__common__identity`));
	add(new RawFunc("__helios__hash__show", "__helios__bytearray__show"));
	add(new RawFunc("__helios__hash__CURRENT", "__core__bData(#0000000000000000000000000000000000000000000000000000000000000000)"));


	// ScriptContext builtins
	addDataFuncs("__helios__scriptcontext");
	add(new RawFunc("__helios__scriptcontext__new_spending",
	`(tx, output_id) -> {
		__core__constrData(0, __helios__common__list_2(
			tx,
			__core__constrData(1, __helios__common__list_1(output_id))
		))
	}`));
	add(new RawFunc("__helios__scriptcontext__new_minting",
	`(tx, mph) -> {
		__core__constrData(0, __helios__common__list_2(
			tx,
			__core__constrData(0, __helios__common__list_1(mph))
		))
	}`));
	add(new RawFunc("__helios__scriptcontext__new_rewarding",
	`(tx, cred) -> {
		__core__constrData(0, __helios__common__list_2(
			tx,
			__core__constrData(2, __helios__common__list_1(cred))
		))
	}`));
	add(new RawFunc("__helios__scriptcontext__new_certifying",
	`(tx, dcert) -> {
		__core__constrData(0, __helios__common__list_2(
			tx,
			__core__constrData(3, __helios__common__list_1(dcert))
		))
	}`));
	add(new RawFunc("__helios__scriptcontext__tx", "__helios__common__field_0"));
	add(new RawFunc("__helios__scriptcontext__purpose", "__helios__common__field_1"));
	add(new RawFunc("__helios__scriptcontext__get_current_input",
	`(self) -> {
		(id) -> {
			__helios__list__find(__helios__tx__inputs(__helios__scriptcontext__tx(self)))(
				(input) -> {
					__core__equalsData(__helios__txinput__output_id(input), id)
				}
			)
		}(__helios__scriptcontext__get_spending_purpose_output_id(self)())
	}`));
	add(new RawFunc("__helios__scriptcontext__get_spending_purpose_output_id",
	`(self) -> {
		() -> {
			__helios__common__field_0(__helios__common__field_1(self))
		}
	}`));
	add(new RawFunc("__helios__scriptcontext__get_current_validator_hash",
	`(self) -> {
		() -> {
			__helios__credential__validator__hash(
				__helios__credential__validator__cast(
					__helios__address__credential(
						__helios__txoutput__address(
							__helios__txinput__output(
								__helios__scriptcontext__get_current_input(self)
							)
						)
					)
				)
			)
		}
	}`));
	add(new RawFunc("__helios__scriptcontext__get_current_minting_policy_hash", "__helios__scriptcontext__get_spending_purpose_output_id"));
	add(new RawFunc("__helios__scriptcontext__get_staking_purpose", 
	`(self) -> {
		() -> {
			__helios__scriptcontext__purpose(self)
		}
	}`));


	// StakingPurpose builtins
	addDataFuncs("__helios__stakingpurpose");


	// StakingPurpose::Rewarding builtins
	addEnumDataFuncs("__helios__stakingpurpose__rewarding");
	add(new RawFunc("__helios__stakingpurpose__rewarding__credential", "__helios__common__field_0"));

	
	// StakingPurpose::Certifying builtins
	addEnumDataFuncs("__helios__stakingpurpose__certifying");
	add(new RawFunc("__helios__stakingpurpose__certifying__dcert", "__helios__common__field_0"));


	// DCert builtins
	addDataFuncs("__helios__dcert");
	add(new RawFunc("__helios__dcert__new_register",
	`(cred) -> {
		__core__constrData(0, __helios__common__list_1(cred))
	}`));
	add(new RawFunc("__helios__dcert__new_deregister",
	`(cred) -> {
		__core__constrData(1, __helios__common__list_1(cred))
	}`));
	add(new RawFunc("__helios__dcert__new_delegate",
	`(cred, pool_id) -> {
		__core__constrData(2, __helios__common__list_2(cred, pool_id))
	}`));
	add(new RawFunc("__helios__dcert__new_register_pool",
	`(id, vrf) -> {
		__core__constrData(3, __helios__common__list_2(id, vrf))
	}`));
	add(new RawFunc("__helios__dcert__new_retire_pool",
	`(id, epoch) -> {
		__core__constrData(4, __helios__common__list_2(id, epoch))
	}`));


	// DCert::Register builtins
	addEnumDataFuncs("__helios__dcert__register");
	add(new RawFunc("__helios__dcert__register__credential", "__helios__common__field_0"));


	// DCert::Deregister builtins
	addEnumDataFuncs("__helios__dcert__deregister");
	add(new RawFunc("__helios__dcert__deregister__credential", "__helios__common__field_0"));


	// DCert::Delegate builtins
	addEnumDataFuncs("__helios__dcert__delegate");
	add(new RawFunc("__helios__dcert__delegate__delegator", "__helios__common__field_0"));
	add(new RawFunc("__helios__dcert__delegate__pool_id", "__helios__common__field_1"));


	// DCert::RegisterPool builtins
	addEnumDataFuncs("__helios__dcert__registerpool");
	add(new RawFunc("__helios__dcert__registerpool__pool_id", "__helios__common__field_0"));
	add(new RawFunc("__helios__dcert__registerpool__pool_vrf", "__helios__common__field_1"));


	// DCert::RetirePool builtins
	addEnumDataFuncs("__helios__dcert__retirepool");
	add(new RawFunc("__helios__dcert__retirepool__pool_id", "__helios__common__field_0"));
	add(new RawFunc("__helios__dcert__retirepool__epoch", "__helios__common__field_1"));


	// Tx builtins
	addDataFuncs("__helios__tx");
	add(new RawFunc("__helios__tx__new",
	`(inputs, ref_inputs, outputs, fee, minted, dcerts, withdrawals, validity, signatories, datums) -> {
		__core__constrData(0, __helios__common__list_12(
			inputs,
			ref_inputs,
			outputs,
			fee,
			minted,
			dcerts,
			withdrawals,
			validity,
			signatories,
			__core__mapData(__core__mkNilPairData(())),
			datums,
			__helios__txid__CURRENT
		))
	}`));
	add(new RawFunc("__helios__tx__inputs", "__helios__common__field_0"));
	add(new RawFunc("__helios__tx__ref_inputs", "__helios__common__field_1"))
	add(new RawFunc("__helios__tx__outputs", "__helios__common__field_2"));
	add(new RawFunc("__helios__tx__fee", "__helios__common__field_3"));
	add(new RawFunc("__helios__tx__minted", "__helios__common__field_4"));
	add(new RawFunc("__helios__tx__dcerts", "__helios__common__field_5"));
	add(new RawFunc("__helios__tx__withdrawals", "__helios__common__field_6"));
	add(new RawFunc("__helios__tx__time_range", "__helios__common__field_7"));
	add(new RawFunc("__helios__tx__signatories", "__helios__common__field_8"));
	add(new RawFunc("__helios__tx__redeemers", "__helios__common__field_9"));
	add(new RawFunc("__helios__tx__datums", "__helios__common__field_10"));// hidden getter, used by __helios__tx__find_datum_hash
	add(new RawFunc("__helios__tx__id", "__helios__common__field_11"));
	add(new RawFunc("__helios__tx__now",
	`(self) -> {
		() -> {
			__helios__timerange__get_start(__helios__tx__time_range(self))()
		}
	}`));
	add(new RawFunc("__helios__tx__find_datum_hash",
	`(self) -> {
		(datum) -> {
			__core__fstPair(__helios__common__find(__core__unMapData(__helios__tx__datums(self)),
				(pair) -> {
					__core__equalsData(__core__sndPair(pair), datum)
				}
			))
		}
	}`));
	add(new RawFunc("__helios__tx__filter_outputs",
	`(self, fn) -> {
		__core__listData(
			__helios__common__filter_list(
				__core__unListData(__helios__tx__outputs(self)), 
				fn
			)
		)
	}`));
	add(new RawFunc("__helios__tx__outputs_sent_to",
	`(self) -> {
		(pubKeyHash) -> {
			__helios__tx__filter_outputs(self, (output) -> {
				__helios__txoutput__is_sent_to(output)(pubKeyHash)
			})
		}
	}`));
	add(new RawFunc("__helios__tx__outputs_sent_to_datum",
	`(self) -> {
		(pubKeyHash, datum) -> {
			(datumHash) -> {
				__helios__tx__filter_outputs(self, (output) -> {
					__helios__bool__and(
						() -> {
							__helios__txoutput__is_sent_to(output)(pubKeyHash)
						},
						() -> {
							__helios__txoutput__has_datum_hash(output, datumHash)
						}
					)
				})
			}(__helios__tx__find_datum_hash(self)(datum))
		}
	}`));
	add(new RawFunc("__helios__tx__outputs_locked_by",
	`(self) -> {
		(validatorHash) -> {
			__helios__tx__filter_outputs(self, (output) -> {
				__helios__txoutput__is_locked_by(output)(validatorHash)
			})
		}
	}`));
	add(new RawFunc("__helios__tx__outputs_locked_by_datum",
	`(self) -> {
		(validatorHash, datum) -> {
			(datumHash) -> {
				__helios__tx__filter_outputs(self, (output) -> {
					__helios__bool__and(
						() -> {
							__helios__txoutput__is_locked_by(output)(validatorHash)
						},
						() -> {
							__helios__txoutput__has_datum_hash(output, datumHash)
						}
					)
				})
			}(__helios__tx__find_datum_hash(self)(datum))
		}
	}`));
	add(new RawFunc("__helios__tx__value_sent_to",
	`(self) -> {
		(pubKeyHash) -> {
			__helios__txoutput__sum_values(__helios__tx__outputs_sent_to(self)(pubKeyHash))
		}
	}`));
	add(new RawFunc("__helios__tx__value_sent_to_datum",
	`(self) -> {
		(pubKeyHash, datum) -> {
			__helios__txoutput__sum_values(__helios__tx__outputs_sent_to_datum(self)(pubKeyHash, datum))
		}
	}`));
	add(new RawFunc("__helios__tx__value_locked_by",
	`(self) -> {
		(validatorHash) -> {
			__helios__txoutput__sum_values(__helios__tx__outputs_locked_by(self)(validatorHash))
		}
	}`));
	add(new RawFunc("__helios__tx__value_locked_by_datum",
	`(self) -> {
		(validatorHash, datum) -> {
			__helios__txoutput__sum_values(__helios__tx__outputs_locked_by_datum(self)(validatorHash, datum))
		}
	}`));
	add(new RawFunc("__helios__tx__is_signed_by",
	`(self) -> {
		(hash) -> {
			__helios__common__any(
				__core__unListData(__helios__tx__signatories(self)),
				(signatory) -> {
					__core__equalsData(signatory, hash)
				}
			)
		}
	}`));


	// TxId builtins
	addDataFuncs("__helios__txid");
	add(new RawFunc("__helios__txid__new",
	`(bytes) -> {
		__core__constrData(0, __helios__common__list_1(bytes)) 
	}`));
	add(new RawFunc("__helios__txid__CURRENT", "__helios__txid__new(__core__bData(#0000000000000000000000000000000000000000000000000000000000000000))"));


	// TxInput builtins
	addDataFuncs("__helios__txinput");
	add(new RawFunc("__helios__txinput__new",
	`(output_id, output) -> {
		__core__constrData(0, __helios__common__list_2(output_id, output))
	}`));
	add(new RawFunc("__helios__txinput__output_id", "__helios__common__field_0"));
	add(new RawFunc("__helios__txinput__output", "__helios__common__field_1"));
	

	// TxOutput builtins
	addDataFuncs("__helios__txoutput");
	add(new RawFunc("__helios__txoutput__new", 
	`(address, value, datum) -> {
		__core__constrData(0, __helios__common__list_3(address, value, datum))
	}`));
	add(new RawFunc("__helios__txoutput__address", "__helios__common__field_0"));
	add(new RawFunc("__helios__txoutput__value", "__helios__common__field_1"));
	add(new RawFunc("__helios__txoutput__datum", "__helios__common__field_2"));
	add(new RawFunc("__helios__txoutput__get_datum_hash",
	`(self) -> {
		() -> {
			(pair) -> {
				__core__ifThenElse(
					__core__equalsInteger(__core__fstPair(pair), 1),
					() -> {__core__headList(__core__sndPair(pair))},
					() -> {__core__bData(#)}
				)()
			}(__core__unConstrData(__helios__common__field_2(self)))
		}
	}`));
	add(new RawFunc("__helios__txoutput__has_datum_hash",
	`(self, datumHash) -> {
		__core__equalsData(__helios__txoutput__get_datum_hash(self)(), datumHash)
	}`));
	add(new RawFunc("__helios__txoutput__is_locked_by",
	`(self) -> {
		(hash) -> {
			(credential) -> {
				__core__ifThenElse(
					__helios__credential__is_validator(credential),
					() -> {
						__core__equalsData(
							hash, 
							__helios__credential__validator__hash(
								__helios__credential__validator__cast(credential)
							)
						)
					},
					() -> {false}
				)()
			}(__helios__address__credential(__helios__txoutput__address(self)))
		}
	}`));
	add(new RawFunc("__helios__txoutput__is_sent_to",
	`(self) -> {
		(pkh) -> {
			(credential) -> {
				__core__ifThenElse(
					__helios__credential__is_pubkey(credential),
					() -> {
						__core__equalsData(
							pkh, 
							__helios__credential__pubkey__hash(
								__helios__credential__pubkey__cast(credential)
							)
						)
					},
					() -> {false}
				)()
			}(__helios__address__credential(__helios__txoutput__address(self)))
		}
	}`));
	add(new RawFunc("__helios__txoutput__sum_values",
	`(outputs) -> {
		__helios__list__fold(outputs)(
			(prev, txOutput) -> {
				__helios__value____add(prev)(__helios__txoutput__value(txOutput))
			}, 
			__helios__value__ZERO
		)	
	}`));


	// OutputDatum
	addDataFuncs("__helios__outputdatum");
	add(new RawFunc("__helios__outputdatum__new_none",
	`() -> {
		__core__constrData(0, __helios__common__list_0)
	}`));
	add(new RawFunc("__helios__outputdatum__new_hash",
	`(hash) -> {
		__core__constrData(1, __helios__common__list_1(hash))
	}`));
	add(new RawFunc("__helios__outputdatum__new_inline",
	`(data) -> {
		__core__constrData(2, __helios__common__list_1(data))
	}`));


	// OutputDatum::None
	addEnumDataFuncs("__helios__outputdatum__none");
	

	// OutputDatum::Hash
	addEnumDataFuncs("__helios__outputdatum__hash");
	add(new RawFunc("__helios__outputdatum__hash__hash", "__helios__common__field_0"));


	// OutputDatum::Inline
	addEnumDataFuncs("__helios__outputdatum__inline");
	add(new RawFunc("__helios__outputdatum__inline__data", "__helios__common__field_0"));


	// RawData
	addDataFuncs("__helios__data");


	// TxOutputId
	addDataFuncs("__helios__txoutputid");
	add(new RawFunc("__helios__txoutputid__new",
	`(tx_id, idx) -> {
		__core__constrData(0, __helios__common__list_2(tx_id, idx))
	}`));


	// Address
	addDataFuncs("__helios__address");
	add(new RawFunc("__helios__address__new", 
	`(cred, staking_cred) -> {
		__core__constrData(0, __helios__common__list_2(cred, staking_cred))
	}`));
	add(new RawFunc("__helios__address__credential", "__helios__common__field_0"));
	add(new RawFunc("__helios__address__staking_credential", "__helios__common__field_1"));
	add(new RawFunc("__helios__address__is_staked",
	`(self) -> {
		() -> {
			__core__equalsInteger(__core__fstPair(__core__unConstrData(__helios__common__field_1(self))), 0)
		}
	}`));


	// Credential builtins
	addDataFuncs("__helios__credential");
	add(new RawFunc("__helios__credential__new_pubkey",
	`(hash) -> {
		__core__constrData(0, __helios__common__list_1(hash))
	}`));
	add(new RawFunc("__helios__credential__new_validator",
	`(hash) -> {
		__core__constrData(1, __helios__common__list_1(hash))
	}`));
	add(new RawFunc("__helios__credential__is_pubkey",
	`(self) -> {
		__core__equalsInteger(__core__fstPair(__core__unConstrData(self)), 0)
	}`));
	add(new RawFunc("__helios__credential__is_validator",
	`(self) -> {
		__core__equalsInteger(__core__fstPair(__core__unConstrData(self)), 1)
	}`));


	// Credential::PubKey builtins
	addEnumDataFuncs("__helios__credential__pubkey");
	add(new RawFunc("__helios__credential__pubkey__cast",
	`(data) -> {
		__helios__common__assert_constr_index(data, 0)
	}`));
	add(new RawFunc("__helios__credential__pubkey__hash", "__helios__common__field_0"));


	// Credential::Validator builtins
	addEnumDataFuncs("__helios__credential__validator");
	add(new RawFunc("__helios__credential__validator__cast",
	`(data) -> {
		__helios__common__assert_constr_index(data, 1)
	}`));
	add(new RawFunc("__helios__credential__validator__hash", "__helios__common__field_0"));


	// StakingCredential builtins
	addDataFuncs("__helios__stakingcredential");
	add(new RawFunc("__helios__stakingcredential__new_hash", 
	`(cred) -> {
		__core__constrData(0, __helios__common__list_1(cred))
	}`));
	add(new RawFunc("__helios__stakingcredential__new_ptr", 
	`(i, j, k) -> {
		__core__constrData(1, __helios__common__list_3(i, j, k))
	}`));

	
	// StakingCredential::Hash builtins
	addEnumDataFuncs("__helios__stakingcredential__hash");


	// StakingCredential::Ptr builtins
	addEnumDataFuncs("__helios__stakingcredential__ptr");


	// Time builtins
	addDataFuncs("__helios__time");
	add(new RawFunc("__helios__time__new", `__helios__common__identity`));
	add(new RawFunc("__helios__time____add", `__helios__int____add`));
	add(new RawFunc("__helios__time____sub", `__helios__int____sub`));
	add(new RawFunc("__helios__time____geq", `__helios__int____geq`));
	add(new RawFunc("__helios__time____gt", `__helios__int____gt`));
	add(new RawFunc("__helios__time____leq", `__helios__int____leq`));
	add(new RawFunc("__helios__time____lt", `__helios__int____lt`));
	add(new RawFunc("__helios__time__show", `__helios__int__show`));


	// Duratin builtins
	addDataFuncs("__helios__duration");
	add(new RawFunc("__helios__duration__new", `__helios__common__identity`));
	add(new RawFunc("__helios__duration____add", `__helios__int____add`));
	add(new RawFunc("__helios__duration____sub", `__helios__int____sub`));
	add(new RawFunc("__helios__duration____mul", `__helios__int____mul`));
	add(new RawFunc("__helios__duration____div", `__helios__int____div`));
	add(new RawFunc("__helios__duration____mod", `__helios__int____mod`));
	add(new RawFunc("__helios__duration____geq", `__helios__int____geq`));
	add(new RawFunc("__helios__duration____gt", `__helios__int____gt`));
	add(new RawFunc("__helios__duration____leq", `__helios__int____leq`));
	add(new RawFunc("__helios__duration____lt", `__helios__int____lt`));


	// TimeRange builtins
	addDataFuncs("__helios__timerange");
	add(new RawFunc("__helios__timerange__new", `
	(a, b) -> {
		__core__constrData(0, __helios__common__list_2(
			__core__constrData(0, __helios__common__list_2(
				__core__constrData(1, __helios__common__list_1(a)),
				__helios__common__boolData(true)
			)),
			__core__constrData(0, __helios__common__list_2(
				__core__constrData(1, __helios__common__list_1(b)),
				__helios__common__boolData(true)
			))
		))
	}`));
	add(new RawFunc("__helios__timerange__ALWAYS", `
	__core__constrData(0, __helios__common__list_2(
		__core__constrData(0, __helios__common__list_2(
			__core__constrData(0, __helios__common__list_0),
			__helios__common__boolData(true)
		)),
		__core__constrData(0, __helios__common__list_2(
			__core__constrData(2, __helios__common__list_0),
			__helios__common__boolData(true)
		))
	))`));
	add(new RawFunc("__helios__timerange__NEVER", `
	__core__constrData(0, __helios__common__list_2(
		__core__constrData(0, __helios__common__list_2(
			__core__constrData(2, __helios__common__list_0),
			__helios__common__boolData(true)
		)),
		__core__constrData(0, __helios__common__list_2(
			__core__constrData(0, __helios__common__list_0),
			__helios__common__boolData(true)
		))
	))`));
	add(new RawFunc("__helios__timerange__from", `
	(a) -> {
		__core__constrData(0, __helios__common__list_2(
			__core__constrData(0, __helios__common__list_2(
				__core__constrData(1, __helios__common__list_1(a)),
				__helios__common__boolData(true)
			)),
			__core__constrData(0, __helios__common__list_2(
				__core__constrData(2, __helios__common__list_0),
				__helios__common__boolData(true)
			))
		))
	}`));
	add(new RawFunc("__helios__timerange__to", `
	(b) -> {
		__core__constrData(0, __helios__common__list_2(
			__core__constrData(0, __helios__common__list_2(
				__core__constrData(0, __helios__common__list_0),
				__helios__common__boolData(true)
			)),
			__core__constrData(0, __helios__common__list_2(
				__core__constrData(1, __helios__common__list_1(b)),
				__helios__common__boolData(true)
			))
		))
	}`));
	add(new RawFunc("__helios__timerange__is_before", 
	`(self) -> {
		(t) -> {
			(upper) -> {
				(extended, closed) -> {
					(extType) -> {
						__core__ifThenElse(
							__core__equalsInteger(extType, 2),
							() -> {false},
							() -> {
								__core__ifThenElse(
									__core__equalsInteger(extType, 0),
									() -> {true},
									() -> {
										__core__ifThenElse(
											closed,
											() -> {__core__lessThanInteger(__core__unIData(__core__headList(__core__sndPair(__core__unConstrData(extended)))), __core__unIData(t))},
											() -> {__core__lessThanEqualsInteger(__core__unIData(__core__headList(__core__sndPair(__core__unConstrData(extended)))), __core__unIData(t))}
										)()
									}
								)()
							}
						)()
					}(__core__fstPair(__core__unConstrData(extended)))
				}(__helios__common__field_0(upper), __helios__common__unBoolData(__helios__common__field_1(upper)))
			}(__helios__common__field_1(self))
		}
	}`));
	add(new RawFunc("__helios__timerange__is_after",
	`(self) -> {
		(t) -> {
			(lower) -> {
				(extended, closed) -> {
					(extType) -> {
						__core__ifThenElse(
							__core__equalsInteger(extType, 0),
							() -> {false},
							() -> {
								__core__ifThenElse(
									__core__equalsInteger(extType, 2),
									() -> {true},
									() -> {
										__core__ifThenElse(
											closed,
											() -> {__core__lessThanInteger(__core__unIData(t), __core__unIData(__core__headList(__core__sndPair(__core__unConstrData(extended)))))},
											() -> {__core__lessThanEqualsInteger(__core__unIData(t), __core__unIData(__core__headList(__core__sndPair(__core__unConstrData(extended)))))}
										)()
									}
								)()
							}
						)()
					}(__core__fstPair(__core__unConstrData(extended)))
				}(__helios__common__field_0(lower), __helios__common__unBoolData(__helios__common__field_1(lower)))
			}(__helios__common__field_0(self))
		}
	}`));
	add(new RawFunc("__helios__timerange__contains",
	`(self) -> {
		(t) -> {
			(lower) -> {
				(extended, closed) -> {
					(lowerExtType, checkUpper) -> {
						__core__ifThenElse(
							__core__equalsInteger(lowerExtType, 2),
							() -> {false},
							() -> {
								__core__ifThenElse(
									__core__equalsInteger(lowerExtType, 0),
									() -> {checkUpper()},
									() -> {
										__core__ifThenElse(
											__core__ifThenElse(
												closed,
												() -> {__core__lessThanEqualsInteger(__core__unIData(__core__headList(__core__sndPair(__core__unConstrData(extended)))), __core__unIData(t))},
												() -> {__core__lessThanInteger(__core__unIData(__core__headList(__core__sndPair(__core__unConstrData(extended)))), __core__unIData(t))}
											)(),
											() -> {checkUpper()},
											() -> {false}
										)()
									}
								)()
							}
						)()
					}(__core__fstPair(__core__unConstrData(extended)), () -> {
						(upper) -> {
							(extended, closed) -> {
								(upperExtType) -> {
									__core__ifThenElse(
										__core__equalsInteger(upperExtType, 0),
										() -> {false},
										() -> {
											__core__ifThenElse(
												__core__equalsInteger(upperExtType, 2),
												() -> {true},
												() -> {
													__core__ifThenElse(
														__core__ifThenElse(
															closed,
															() -> {__core__lessThanEqualsInteger(__core__unIData(t), __core__unIData(__core__headList(__core__sndPair(__core__unConstrData(extended)))))},
															() -> {__core__lessThanInteger(__core__unIData(t), __core__unIData(__core__headList(__core__sndPair(__core__unConstrData(extended)))))}
														)(),
														true,
														false
													)
												}
											)()
										}
									)()
								}(__core__fstPair(__core__unConstrData(extended)))
							}(__helios__common__field_0(upper), __helios__common__unBoolData(__helios__common__field_1(upper)))
						}(__helios__common__field_1(self))
					})
				}(__helios__common__field_0(lower), __helios__common__unBoolData(__helios__common__field_1(lower)))
			}(__helios__common__field_0(self))
		}
	}`));
	add(new RawFunc("__helios__timerange__get_start",
	`(self) -> {
		() -> {
			__helios__common__field_0(__helios__common__field_0(__helios__common__field_0(self)))
		}
	}`));


	// AssetClass builtins
	addDataFuncs("__helios__assetclass");
	add(new RawFunc("__helios__assetclass__ADA", `__helios__assetclass__new(__core__bData(#), __core__bData(#))`));
	add(new RawFunc("__helios__assetclass__new",
	`(mintingPolicyHash, tokenName) -> {
		__core__constrData(0, __helios__common__list_2(mintingPolicyHash, tokenName))
	}`));


	// MoneyValue builtins
	add(new RawFunc("__helios__value__serialize", "__helios__common__serialize"));
	add(new RawFunc("__helios__value__from_data", "__helios__common__identity"));
	add(new RawFunc("__helios__value__ZERO", `__core__mapData(__core__mkNilPairData(()))`));
	add(new RawFunc("__helios__value__lovelace",
	`(i) -> {
		__helios__value__new(__helios__assetclass__ADA, i)
	}`));
	add(new RawFunc("__helios__value__new",
	`(assetClass, i) -> {
		__core__ifThenElse(
			__core__equalsInteger(0, __core__unIData(i)),
			() -> {
				__helios__value__ZERO
			},
			() -> {
				(mintingPolicyHash, tokenName) -> {
					__core__mapData(
						__core__mkCons(
							__core__mkPairData(
								mintingPolicyHash, 
								__core__mapData(
									__core__mkCons(
										__core__mkPairData(tokenName, i), 
										__core__mkNilPairData(())
									)
								)
							), 
							__core__mkNilPairData(())
						)
					)
				}(__helios__common__field_0(assetClass), __helios__common__field_1(assetClass))
			}
		)()
	}`));
	add(new RawFunc("__helios__value__get_map_keys",
	`(map) -> {
		(recurse) -> {
			recurse(recurse, map)
		}(
			(recurse, map) -> {
				__core__ifThenElse(
					__core__nullList(map), 
					() -> {__helios__common__list_0}, 
					() -> {__core__mkCons(__core__fstPair(__core__headList(map)), recurse(recurse, __core__tailList(map)))}
				)()
			}
		)
	}`));
	add(new RawFunc("__helios__value__merge_map_keys",
	`(a, b) -> {
		(aKeys) -> {
			(recurse) -> {
				(uniqueBKeys) -> {
					__helios__common__concat(aKeys, uniqueBKeys)
				}(recurse(recurse, aKeys, b))
			}(
				(recurse, keys, map) -> {
					__core__ifThenElse(
						__core__nullList(map), 
						() -> {__helios__common__list_0}, 
						() -> {
							(key) -> {
								__core__ifThenElse(
									__helios__common__is_in_bytearray_list(aKeys, key), 
									() -> {recurse(recurse, keys, __core__tailList(map))},
									() -> {__core__mkCons(key, recurse(recurse, keys, __core__tailList(map)))}
								)()
							}(__core__fstPair(__core__headList(map)))
						}
					)()
				}
			)
		}(__helios__value__get_map_keys(a))
	}`));

	add(new RawFunc("__helios__value__get_inner_map",
	`(map, mph) -> {
		(recurse) -> {
			recurse(recurse, map)
		}(
			(recurse, map) -> {
				__core__ifThenElse(
					__core__nullList(map), 
					() -> {__core__mkNilPairData(())},
					() -> {
						__core__ifThenElse(
							__core__equalsData(__core__fstPair(__core__headList(map)), mph), 
							() -> {__core__unMapData(__core__sndPair(__core__headList(map)))},
							() -> {recurse(recurse, __core__tailList(map))}
						)()
					}
				)()
			}
		)
	}`));
	add(new RawFunc("__helios__value__get_inner_map_int",
	`(map, key) -> {
		(recurse) -> {
			recurse(recurse, map, key)
		}(
			(recurse, map, key) -> {
				__core__ifThenElse(
					__core__nullList(map), 
					() -> {0}, 
					() -> {
						__core__ifThenElse(
							__core__equalsData(__core__fstPair(__core__headList(map)), key), 
							() -> {__core__unIData(__core__sndPair(__core__headList(map)))}, 
							() -> {recurse(recurse, __core__tailList(map), key)}
						)()
					}
				)()
			}
		)
	}`));
	add(new RawFunc("__helios__value__add_or_subtract_inner",
	`(op) -> {
		(a, b) -> {
			(recurse) -> {
				recurse(recurse, __helios__value__merge_map_keys(a, b), __core__mkNilPairData(()))
			}(
				(recurse, keys, result) -> {
					__core__ifThenElse(
						__core__nullList(keys), 
						() -> {result}, 
						() -> {
							(key, tail) -> {
								(sum) -> {
									__core__ifThenElse(
										__core__equalsInteger(sum, 0), 
										() -> {tail}, 
										() -> {__core__mkCons(__core__mkPairData(key, __core__iData(sum)), tail)}
									)()
								}(op(__helios__value__get_inner_map_int(a, key), __helios__value__get_inner_map_int(b, key)))
							}(__core__headList(keys), recurse(recurse, __core__tailList(keys), result))
						}
					)()
				}
			)
		}
	}`));
	add(new RawFunc("__helios__value__add_or_subtract",
	`(op, a, b) -> {
		(a, b) -> {
			(recurse) -> {
				__core__mapData(recurse(recurse, __helios__value__merge_map_keys(a, b), __core__mkNilPairData(())))
			}(
				(recurse, keys, result) -> {
					__core__ifThenElse(
						__core__nullList(keys), 
						() -> {result}, 
						() -> {
							(key, tail) -> {
								(item) -> {
									__core__ifThenElse(
										__core__nullList(item), 
										() -> {tail}, 
										() -> {__core__mkCons(__core__mkPairData(key, __core__mapData(item)), tail)}
									)()
								}(__helios__value__add_or_subtract_inner(op)(__helios__value__get_inner_map(a, key), __helios__value__get_inner_map(b, key)))
							}(__core__headList(keys), recurse(recurse, __core__tailList(keys), result))
						}
					)()
				}
			)
		}(__core__unMapData(a), __core__unMapData(b))
	}`));
	add(new RawFunc("__helios__value__map_amounts",
	`(self, op) -> {
		(self) -> {
			(recurseInner) -> {
				(recurseOuter) -> {
					__core__mapData(recurseOuter(recurseOuter, self))
				}(
					(recurseOuter, outer) -> {
						__core__ifThenElse(
							__core__nullList(outer),
							() -> {__core__mkNilPairData(())},
							() -> {
								(head) -> {
									__core__mkCons(
										__core__mkPairData(
											__core__fstPair(head), 
											__core__mapData(recurseInner(recurseInner, __core__unMapData(__core__sndPair(head))))
										),  
										recurseOuter(recurseOuter, __core__tailList(outer))
									)
								}(__core__headList(outer))
							}
						)()
					}
				)
			}(
				(recurseInner, inner) -> {
					__core__ifThenElse(
						__core__nullList(inner),
						() -> {__core__mkNilPairData(())},
						() -> {
							(head) -> {
								__core__mkCons(
									__core__mkPairData(
										__core__fstPair(head),
										__core__iData(op(__core__unIData(__core__sndPair(head))))
									),
									recurseInner(recurseInner, __core__tailList(inner))
								)
							}(__core__headList(inner))
						}
					)()
				}
			)
		}(__core__unMapData(self))
	}`));
	add(new RawFunc("__helios__value__compare_inner",
	`(comp, a, b) -> {
		(recurse) -> {
			recurse(recurse, __helios__value__merge_map_keys(a, b))
		}(
			(recurse, keys) -> {
				__core__ifThenElse(
					__core__nullList(keys), 
					() -> {true}, 
					() -> {
						(key) -> {
							__core__ifThenElse(
								__helios__common__not(comp(__helios__value__get_inner_map_int(a, key), __helios__value__get_inner_map_int(b, key))), 
								() -> {false}, 
								() -> {recurse(recurse, __core__tailList(keys))}
							)()
						}(__core__headList(keys))
					}
				)()
			}
		)
	}`));
	add(new RawFunc("__helios__value__compare",
	`(comp, a, b) -> {
		(a, b) -> {
			(recurse) -> {
				recurse(recurse, __helios__value__merge_map_keys(a, b))
			}(
				(recurse, keys) -> {
					__core__ifThenElse(
						__core__nullList(keys), 
						() -> {true}, 
						() -> {
							(key) -> {
								__core__ifThenElse(
									__helios__common__not(
										__helios__value__compare_inner(
											comp, 
											__helios__value__get_inner_map(a, key), 
											__helios__value__get_inner_map(b, key)
										)
									), 
									() -> {false}, 
									() -> {recurse(recurse, __core__tailList(keys))}
								)()
							}(__core__headList(keys))
						}
					)()
				}
			)
		}(__core__unMapData(a), __core__unMapData(b))
	}`));
	add(new RawFunc("__helios__value____eq",
	`(self) -> {
		(other) -> {
			__helios__value__compare((a, b) -> {__core__equalsInteger(a, b)}, self, other)
		}
	}`));
	add(new RawFunc("__helios__value____neq",
	`(self) -> {
		(other) -> {
			__helios__bool____not(__helios__value____eq(self)(other))()
		}
	}`));
	add(new RawFunc("__helios__value____add",
	`(self) -> {
		(other) -> {
			__helios__value__add_or_subtract((a, b) -> {__core__addInteger(a, b)}, self, other)
		}
	}`));
	add(new RawFunc("__helios__value____sub",
	`(self) -> {
		(other) -> {
			__helios__value__add_or_subtract((a, b) -> {__core__subtractInteger(a, b)}, self, other)
		}
	}`));
	add(new RawFunc("__helios__value____mul",
	`(self) -> {
		(scale) -> {
			(scale) -> {
				__helios__value__map_amounts(self, (amount) -> {__core__multiplyInteger(amount, scale)})
			}(__core__unIData(scale))
		}
	}`));
	add(new RawFunc("__helios__value____div",
	`(self) -> {
		(den) -> {
			(den) -> {
				__helios__value__map_amounts(self, (amount) -> {__core__divideInteger(amount, den)})
			}(__core__unIData(den))
		}
	}`));
	add(new RawFunc("__helios__value____geq",
	`(self) -> {
		(other) -> {
			__helios__value__compare((a, b) -> {__helios__common__not(__core__lessThanInteger(a, b))}, self, other)
		}
	}`));
	add(new RawFunc("__helios__value__contains", "__helios__value____geq"));
	add(new RawFunc("__helios__value____gt",
	`(self) -> {
		(other) -> {
			__helios__bool__and(
				__helios__bool____not(
					__helios__bool__and(
						__helios__value__is_zero(self),
						__helios__value__is_zero(other)
					)
				),
				() -> {
					__helios__value__compare(
						(a, b) -> {
							__helios__common__not(__core__lessThanEqualsInteger(a, b))
						}, 
						self, 
						other
					)
				}
			)
		}
	}`));
	add(new RawFunc("__helios__value____leq",
	`(self) -> {
		(other) -> {
			__helios__value__compare((a, b) -> {__core__lessThanEqualsInteger(a, b)}, self, other)
		}
	}`));
	add(new RawFunc("__helios__value____lt",
	`(self) -> {
		(other) -> {
			__helios__bool__and(
				__helios__bool____not(
					__helios__bool__and(
						__helios__value__is_zero(self),
						__helios__value__is_zero(other)
					)
				),
				() -> {
					__helios__value__compare(
						(a, b) -> {
							__core__lessThanInteger(a, b)
						}, 
						self, 
						other
					)
				}
			)
		}
	}`));
	add(new RawFunc("__helios__value__is_zero",
	`(self) -> {
		() -> {
			__core__nullList(__core__unMapData(self))
		}
	}`));
	add(new RawFunc("__helios__value__get",
	`(self) -> {
		(assetClass) -> {
			(map, mintingPolicyHash, tokenName) -> {
				(outer, inner) -> {
					outer(outer, inner, map)
				}(
					(outer, inner, map) -> {
						__core__ifThenElse(
							__core__nullList(map), 
							() -> {__core__error("policy not found")}, 
							() -> {
								__core__ifThenElse(
									__core__equalsData(__core__fstPair(__core__headList(map)), mintingPolicyHash), 
									() -> {inner(inner, __core__unMapData(__core__sndPair(__core__headList(map))))}, 
									() -> {outer(outer, inner, __core__tailList(map))}
								)()
							}
						)()
					}, (inner, map) -> {
						__core__ifThenElse(
							__core__nullList(map), 
							() -> {__core__error("tokenName not found")}, 
							() -> {
								__core__ifThenElse(
									__core__equalsData(__core__fstPair(__core__headList(map)), tokenName),
									() -> {__core__sndPair(__core__headList(map))},
									() -> {inner(inner, __core__tailList(map))}
								)()
							}
						)()
					}
				)
			}(__core__unMapData(self), __helios__common__field_0(assetClass), __helios__common__field_1(assetClass))
		}
	}`));
	add(new RawFunc("__helios__value__get_policy", 
	`(self) -> {
		(mph) -> {
			(map) -> {
				(recurse) -> {
					recurse(recurse, map)
				}(
					(recurse, map) -> {
						__core__ifThenElse(
							__core__nullList(map),
							() -> {__core__error("policy not found")},
							() -> {
								__core__ifThenElse(
									__core__equalsData(__core__fstPair(__core__headList(map)), mph),
									() -> {__core__sndPair(__core__headList(map))},
									() -> {recurse(recurse, __core__tailList(map))}
								)()
							}
						)()
					}
				)
			}(__core__unMapData(self))
		} 
	}`));

	return db;
}

/**
 * @param {IR} ir 
 * @returns {IR}
 */
function wrapWithRawFunctions(ir) {
	let db = makeRawFunctions();

	// notify statistics of existence of builtin in correct order
	if (onNotifyRawUsage !== null) {
		for (let [name, _] of db) {
			onNotifyRawUsage(name, 0);
		}
	}

	let re = new RegExp("__helios[a-zA-Z0-9_]*", "g");

	let [src, _] = ir.generateSource();

	//console.log(src);

	let matches = src.match(re);

	let map = new Map();

	if (matches !== null) {
		for (let match of matches) {
			if (!map.has(match)) {
				if (!db.has(match)) {
					throw new Error(`builtin ${match} not found`);
				}

				let builtin = assertDefined(db.get(match));

				builtin.load(db, map);
			}
		}
	}

	return Program.wrapWithDefinitions(ir, map);
}


//////////////////////////////////
// Section 15: IR AST objects
//////////////////////////////////

/**
 * Scope for IR names.
 * Works like a stack of named values from which a Debruijn index can be derived
 */
class IRScope {
	#parent;
	/** variable name (can be empty if no usable variable defined at this level) */
	#variable;

	/**
	 * @param {?IRScope} parent 
	 * @param {?IRVariable} variable
	 */
	constructor(parent, variable) {
		this.#parent = parent;
		this.#variable = variable;
	}

	/**
	 * Calculates the Debruijn index of a named value. Internal method
	 * @param {Word | IRVariable} name 
	 * @param {number} index 
	 * @returns {[number, IRVariable]}
	 */
	getInternal(name, index) {
		if (this.#variable !== null && (name instanceof Word && this.#variable.toString() == name.toString()) || (name instanceof IRVariable && this.#variable == name)) {
			return [index, this.#variable];
		} else if (this.#parent === null) {
			throw name.referenceError(`variable ${name.toString()} not found`);
		} else {
			return this.#parent.getInternal(name, index + 1);
		}
	}

	/**
	 * Calculates the Debruijn index.
	 * @param {Word | IRVariable} name 
	 * @returns {[number, IRVariable]}
	 */
	get(name) {
		// one-based
		return this.getInternal(name, 1);
	}

	/**
	 * Checks if a named builtin exists
	 * @param {string} name 
	 * @param {boolean} strict - if true then throws an error if builtin doesn't exist
	 * @returns {boolean}
	 */
	static isBuiltin(name, strict = false) {
		if (name.startsWith("__core")) {
			if (strict) {
				void this.findBuiltin(name); // assert that builtin exists
			}
			return true;
		} else {
			return false;
		}
	}

	/**
	 * Returns index of a named builtin
	 * Throws an error if builtin doesn't exist
	 * @param {string} name 
	 * @returns 
	 */
	static findBuiltin(name) {
		let i = PLUTUS_CORE_BUILTINS.findIndex(info => { return "__core__" + info.name == name });
		assert(i != -1, `${name} is not a real builtin`);
		return i;
	}
}

/**
 * Map of variables to IRExpr
 */
class IRExprStack {
	#map;

	/**
	 * Keeps order
	 * @param {Map<IRVariable, IRExpr>} map
	 */
	constructor(map = new Map()) {
		this.#map = map;
	}

	/**
	 * Doesn't mutate, returns a new stack
	 * @param {IRVariable} ref 
	 * @param {IRExpr} value 
	 * @returns {IRExprStack}
	 */
	set(ref, value) {
		/**
		 * @type {Map<IRVariable, IRExpr>}
		 */
		let map = new Map();

		for (let [k, v] of this.#map) {
			map.set(k, v);
		}

		map.set(ref, value);

		return new IRExprStack(map);
	}

	/**
	 * Mutates
	 * @param {IRVariable} variable
	 * @param {IRExpr} expr
	 */
 	setInline(variable, expr) {
		this.#map.set(variable, expr);
	}

	/**
	 * @param {IRVariable} ref
	 * @returns {boolean}
	 */
	has(ref) {
		return this.#map.has(ref);
	}

	/**
	 * Returns null if not found
	 * @param {IRVariable} ref
	 * @returns {IRExpr}
	 */
	get(ref) {
		return assertDefined(this.#map.get(ref)).copy();
	}

	/**
	 * @returns {IRCallStack}
	 */
	initCallStack() {
		let stack = new IRCallStack();

		for (let [variable, expr] of this.#map) {
			let val = expr.eval(stack);
			if (val !== null) {
				stack = stack.set(variable, val);
			}
		}

		return stack;
	}

	/**
	 * Returns a list of the names in the stack
	 * @returns {string}
	 */
	dump() {
		let names = [];

		for (let [k, _] of this.#map) {
			names.push(k.name);
		}

		return names.join(", ");
	}
}

class IRValue {
	constructor() {
	}

	/**
	 * @param {IRValue[]} args 
	 * @returns {?IRValue}
	 */
	call(args) {
		throw new Error("not a function");
	}

	/**
	 * @type {?IRLiteral}
	 */
	get value() {
		return null;
	}
}

class IRFuncValue extends IRValue {
	#callback;

	/**
	 * @param {(args: IRValue[]) => ?IRValue} callback
	 */
	constructor(callback) {
		super();
		this.#callback = callback;
	}

	/**
	 * @param {IRValue[]} args 
	 * @returns {?IRValue}
	 */
	call(args) {
		return this.#callback(args);
	}
}

class IRLiteralValue extends IRValue {
	#literal;

	/**
	 * @param {IRLiteral} literal 
	 */
	constructor(literal) {
		super();
		this.#literal = literal;
	}

	/**
	 * @type {?IRLiteral}
	 */
	get value() {
		return this.#literal;
	}
}

class IRCallStack {
	#parent;
	#variable;
	#value;

	/**
	 * 
	 * @param {?IRCallStack} parent 
	 * @param {?IRVariable} variable 
	 * @param {?IRValue} value 
	 */
	constructor(parent = null, variable = null, value = null) {
		this.#parent = parent;
		this.#variable = variable;
		this.#value = value;
	}

	/**
	 * @param {IRVariable} variable 
	 * @returns {?IRValue}
	 */
	get(variable) {
		if (this.#variable !== null && this.#variable === variable) {
			return this.#value;
		} else if (this.#parent !== null) {
			return this.#parent.get(variable);
		} else {
			return null;
		}
	}

	/**
	 * @param {IRVariable} variable 
	 * @param {IRValue} value 
	 * @returns {IRCallStack}
	 */
	set(variable, value) {
		return new IRCallStack(this, variable, value);
	}
}

/**
 * IR class that represents function arguments
 */
class IRVariable extends Token {
	#name;

	/**
	 * @param {Word} name
	 */
	constructor(name) {
		super(name.site);
		this.#name = name;
	}

	/**
	 * @type {string}
	 */
	get name() {
		return this.#name.toString();
	}

	toString() {
		return this.name;
	}
}

/**
 * Base class of all Intermediate Representation expressions
 */
class IRExpr extends Token {
	/**
	 * @param {Site} site 
	 */
	constructor(site) {
		super(site);
	}

	/**
	 * Used during inlining/expansion to make sure multiple inlines of IRNameExpr don't interfere when setting the index
	 * @returns {IRExpr}
	 */
	copy() {
		throw new Error("not yet implemented");
	}

	/**
	 * Calc size of equivalent plutus-core expression
	 * @returns {number} - number of bits (not bytes!)
	 */
	calcSize() {
		let term = this.toPlutusCore();

		let bitWriter = new BitWriter(); 

		term.toFlat(bitWriter);

		return bitWriter.length;
	}

	/**
	 * @param {string} indent 
	 * @returns {string}
	 */
	toString(indent = "") {
		throw new Error("not yet implemented");
	}

	/**
	 * Link IRNameExprs to variables
	 * @param {IRScope} scope 
	 */
	resolveNames(scope) {
		throw new Error("not yet implemented");
	}

	/**
	 * Counts the number of times a variable is referenced inside the current expression
	 * @param {IRVariable} ref
	 * @returns {number}
	 */
	countRefs(ref) {
		throw new Error("not yet implemented");
	}

	/**
	 * Inline every variable that can be found in the stack.
	 * @param {IRExprStack} stack
	 * @returns {IRExpr}
	 */
	inline(stack) {
		throw new Error("not yet implemented");
	}

	/**
	 * Evaluates an expression to something (hopefully) literal
	 * Returns null if it the result would be worse than the current expression
	 * Doesn't return an IRLiteral because the resulting expression might still be an improvement, even if it isn't a literal
	 * @param {IRCallStack} stack
	 * @returns {?IRValue}
	 */
	eval(stack) {
		throw new Error("not yet implemented");
	}

	/**
	 * Simplify 'this' by returning something smaller (doesn't mutate)
	 * @param {IRExprStack} stack - contains some global definitions that might be useful for simplification
	 * @returns {IRExpr}
	 */
	simplify(stack) {
		throw new Error("not yet implemented");
	}

	/**
	 * @returns {PlutusCoreTerm}
	 */
	toPlutusCore() {
		throw new Error("not yet implemented");
	}
}

/**
 * Intermediate Representation variable reference expression
 */
 class IRNameExpr extends IRExpr {
	#name;

	/**
	 * @type {?number} - cached debruijn index 
	 */
	#index;

	/**
	 * @type {?IRVariable} - cached variable (note that core functions can be referenced as variables (yet))
	 */
	#variable;

	/**
	 * @param {Word} name 
	 * @param {?IRVariable} variable
	 */
	constructor(name, variable = null) {
		super(name.site);
		assert(name.toString() != "_");
		assert(!name.toString().startsWith("undefined"));
		this.#name = name;
		this.#index = null;
		this.#variable = variable;
	}

	/**
	 * @type {string}
	 */
	get name() {
		return this.#name.toString();
	}

	/**
	 * @type {IRVariable}
	 */
	get variable() {
		if (this.#variable === null) {
			throw new Error("variable should be set");
		} else {
			return this.#variable;
		}
	}

	copy() {
		return new IRNameExpr(this.#name, this.#variable);
	}

	/**
	 * @param {string} indent 
	 * @returns {string}
	 */
	toString(indent = "") {
		return this.#name.toString();
	}

	/**
	 * @param {IRScope} scope 
	 */
	resolveNames(scope) {
		if (!this.name.startsWith("__core")) {
			if (this.#variable == null) {
				[this.#index, this.#variable] = scope.get(this.#name);
			} else {
				[this.#index, this.#variable] = scope.get(this.#variable);
			}
		}
	}

	/**
	 * @param {IRVariable} ref
	 * @returns {number}
	 */
	countRefs(ref) {
		if (this.name.startsWith("__core")) {
			return 0;
		} else if (this.#variable === null) {
			throw new Error("variable should be set");
		} else {
			if (ref === this.#variable) {
				return 1;
			} else {
				return 0;
			}
		}
	}

	/**
	 * @param {IRExprStack} stack
	 * @returns {IRExpr}
	 */
	inline(stack) {
		if (this.name.startsWith("__core")) {
			return this;
		} else if (this.#variable === null) {
			throw new Error("variable should be set");
		} else {
			if (stack.has(this.#variable)) {
				return stack.get(this.#variable).inline(stack);
			} else {
				return this;
			}
		}
	}

	/**
	 * @param {IRCallStack} stack
	 * @returns {?IRValue}
	 */
	eval(stack) {
		if (this.name.startsWith("__core")) {
			return new IRFuncValue((args) => {
				return IRCoreCallExpr.evalValues(this.#name.value, args);
			});
		} else if (this.#variable === null) {
			throw new Error("variable should be set");
		} else {
			let v = stack.get(this.#variable);
			if (v !== null) {
				return v;
			} else {
				return null;
			}
		}
	}

	/**
	 * @param {IRExprStack} stack
	 * @returns {IRExpr}
	 */
	simplify(stack) {
		if (this.name.startsWith("__core")) {
			return this;
		} else if (this.#variable === null) {
			throw new Error("variable should be set");
		} else {
			// first check if expanded version is smaller
			if (stack.has(this.#variable)) {
				let that = stack.get(this.#variable);

				if (that.calcSize() <= this.calcSize()) {
					return that;
				} else {
					return this;
				}
			} else {
				return this;
			}
		}
	}

	/**
	 * @returns {PlutusCoreTerm}
	 */
	toPlutusCore() {
		if (this.name.startsWith("__core")) {
			return IRCoreCallExpr.newPlutusCoreBuiltin(this.site, this.name);
		} else if (this.#index === null) {
			// use a dummy index (for size calculation)
			return new PlutusCoreVariable(
				this.site,
				new PlutusCoreInt(this.site, BigInt(0), false),
			);
		} else {
			return new PlutusCoreVariable(
				this.site,
				new PlutusCoreInt(this.site, BigInt(this.#index), false),
			);
		}
	}
}

/**
 * IR wrapper for PlutusCoreValues, representing literals
 */
 class IRLiteral extends IRExpr {
	/**
	 * @type {PlutusCoreValue}
	 */
	#value;

	/**
	 * @param {PlutusCoreValue} value 
	 */
	constructor(value) {
		super(value.site);

		this.#value = value;
	}

	get value() {
		return this.#value;
	}

	copy() {
		return new IRLiteral(this.#value);
	}

	/**
	 * @param {string} indent 
	 * @returns {string}
	 */
	toString(indent = "") {
		return this.#value.toString();
	}

	/**
	 * Linking doesn't do anything for literals
	 * @param {IRScope} scope 
	 */
	resolveNames(scope) {
	}

	/**
	 * @param {IRVariable} ref
	 * @returns {number}
	 */
	countRefs(ref) {
		return 0;
	}

	/**
	 * Returns 'this' (nothing to inline)
	 * @param {IRExprStack} stack
	 * @returns {IRExpr}
	 */
	inline(stack) {
		return this;
	}
	
	/**
	 * @param {IRCallStack} stack
	 * @returns {?IRValue}
	 */
	eval(stack) {
		return new IRLiteralValue(this);
	}

	/**
	 * @param {IRExprStack} stack
	 * @param {IRLiteral[]} args
	 * @returns {?IRExpr}
	 */
	call(stack, args) {
		throw new Error("can't call literal");
	}

	/**
	 * Returns 'this' (nothing to simplify)
	 * @param {IRExprStack} stack
	 * @returns {IRExpr}
	 */
	simplify(stack) {
		return this;
	}

	/**
	 * @returns {PlutusCoreConst}
	 */
	toPlutusCore() {
		return new PlutusCoreConst(this.#value);
	}
}

/**
 * IR function expression with some args, that act as the header, and a body expression
 */
class IRFuncExpr extends IRExpr {
	#args;
	#body;

	/**
	 * @param {Site} site 
	 * @param {IRVariable[]} args 
	 * @param {IRExpr} body 
	 */
	constructor(site, args, body) {
		super(site);
		this.#args = args;
		this.#body = body;
	}

	get args() {
		return this.#args.slice();
	}

	get body() {
		return this.#body;
	}

	copy() {
		return new IRFuncExpr(this.site, this.args, this.#body.copy());
	}

	/**
	 * @param {string} indent 
	 * @returns {string}
	 */
	toString(indent = "") {
		let s = "(" + this.#args.map(n => n.toString()).join(", ") + ") -> {\n" + indent + "  ";
		s += this.#body.toString(indent + "  ");
		s += "\n" + indent + "}";

		return s;
	}

	/**
	 * @param {IRScope} scope 
	 */
	resolveNames(scope = new IRScope(null, null)) {
		if (this.#args.length == 0) {
			// in the zero-arg case a unit-value needs to be added to the scope (to assure correct DeBruijn index calculation)
			scope = new IRScope(scope, null);
		} else {
			for (let arg of this.#args) {
				scope = new IRScope(scope, arg);
			}
		}

		this.#body.resolveNames(scope);
	}

	/**
	 * @param {IRVariable} ref
	 * @returns {number}
	 */
	countRefs(ref) {
		return this.#body.countRefs(ref);
	}

	/**
	 * Inline expressions in the body
	 * Checking of unused args is done by caller
	 * @param {IRExprStack} stack
	 * @returns {IRFuncExpr}
	 */
	inline(stack) {
		return new IRFuncExpr(this.site, this.#args, this.#body.inline(stack));
	}

	/**
	 * @param {IRCallStack} stack
	 * @returns {?IRValue}
	 */
	eval(stack) {
		return new IRFuncValue((args) => {
			if (args.length != this.#args.length) {
				throw this.site.syntaxError(`expected ${this.#args.length} arg(s), got ${args.length} arg(s)`);
			}

			for (let i = 0; i < args.length; i++) {
				let v = this.#args[i];
				stack = stack.set(v, args[i]);
			}

			return this.#body.eval(stack);
		});
	}

	/**
	 * Simplify body
	 * (Checking of unused args is done by caller)
	 * @param {IRExprStack} stack
	 * @returns {IRFuncExpr}
	 */
	simplify(stack = new IRExprStack()) {
		return new IRFuncExpr(this.site, this.#args, this.#body.simplify(stack));
	}

	/** 
	 * @returns {PlutusCoreTerm}
	 */
	toPlutusCore() {
		let term = this.#body.toPlutusCore();

		if (this.#args.length == 0) {
			// must wrap at least once, even if there are no args
			term = new PlutusCoreLambda(this.site, term);
		} else {
			for (let i = this.#args.length - 1; i >= 0; i--) {
				term = new PlutusCoreLambda(this.site, term, this.#args[i].toString());
			}
		}

		return term;
	}
}


/**
 * Base class of IRUserCallExpr and IRCoreCallExpr
 */
class IRCallExpr extends IRExpr {
	#argExprs;
	#parensSite;

	/**
	 * @param {Site} site
	 * @param {IRExpr[]} argExprs 
	 * @param {Site} parensSite 
	 */
	constructor(site, argExprs, parensSite) {
		super(site);
		this.#argExprs = argExprs;
		this.#parensSite = parensSite;
		
	}

	get argExprs() {
		return this.#argExprs.slice();
	}

	get parensSite() {
		return this.#parensSite;
	}

	/**
	 * @param {string} indent 
	 * @returns {string}
	 */
	argsToString(indent = "") {
		return this.#argExprs.map(argExpr => argExpr.toString(indent)).join(", ")
	}

	/**
	 * @param {IRScope} scope 
	 */
	resolveNames(scope) {
		for (let argExpr of this.#argExprs) {
			argExpr.resolveNames(scope);
		}
	}

	/**
	 * @param {IRVariable} ref
	 * @returns {number}
	 */
	countRefs(ref) {
		let count = 0;
		for (let argExpr of this.#argExprs) {
			count += argExpr.countRefs(ref);
		}

		return count;
	}

	/** 
	 * @param {IRCallStack} stack
	 * @returns {?IRValue[]} 
	 */
	evalArgs(stack) {
		/**
		 * @type {IRValue[]}
		 */
 		let args = [];

		for (let argExpr of this.argExprs) {
			let argVal = argExpr.eval(stack);
			if (argVal !== null) {
				args.push(argVal);
			} else {
				return null;
			}
		}

		return args;
	}

	/**
	 * @param {IRExprStack} stack
	 * @param {boolean} inline
	 * @returns {IRExpr[]}
	 */
	simplifyArgs(stack, inline = false) {
		if (inline) {
			return this.#argExprs.map(argExpr => argExpr.inline(stack));
		} else {
			return this.#argExprs.map(argExpr => argExpr.simplify(stack));
		}
	}

	/**
	 * @param {PlutusCoreTerm} term
	 * @returns {PlutusCoreTerm}
	 */
	toPlutusCoreCall(term) {
		if (this.#argExprs.length == 0) {
			// a PlutusCore function call (aka function application) always requires a argument. In the zero-args case this is the unit value
			term = new PlutusCoreCall(this.site, term, PlutusCoreUnit.newTerm(this.#parensSite));
		} else {
			for (let argExpr of this.#argExprs) {
				term = new PlutusCoreCall(this.site, term, argExpr.toPlutusCore());
			}
		}

		return term;
	}
}

/**
 * IR function call of non-core function
 */
 class IRUserCallExpr extends IRCallExpr {
	#fnExpr;

	/**
	 * @param {IRExpr} fnExpr 
	 * @param {IRExpr[]} argExprs 
	 * @param {Site} parensSite 
	 */
	constructor(fnExpr, argExprs, parensSite) {
		super(fnExpr.site, argExprs, parensSite);

		this.#fnExpr = fnExpr;
	}

	get fnExpr() {
		return this.#fnExpr;
	}

	copy() {
		return new IRUserCallExpr(this.#fnExpr.copy(), this.argExprs.map(a => a.copy()), this.parensSite);
	}

	/**
	 * @param {string} indent
	 * @returns {string}
	 */
	toString(indent = "") {
		return `${this.#fnExpr.toString(indent)}(${this.argsToString(indent)})`;
	}

	/**
	 * @param {IRScope} scope 
	 */
	resolveNames(scope = new IRScope(null, null)) {
		this.#fnExpr.resolveNames(scope);

		super.resolveNames(scope);
	}

	/**
	 * @param {IRVariable} ref
	 * @returns {number}
	 */
	countRefs(ref) {
		return this.#fnExpr.countRefs(ref) + super.countRefs(ref);
	}

	/**
	 * @param {IRCallStack} stack 
	 * @returns {?IRValue}
	 */
	eval(stack) {
		let args = this.evalArgs(stack);

		if (args === null) {
			return null;
		} else {
			let fn = this.#fnExpr.eval(stack);

			if (fn === null) {
				return null;
			} else {
				return fn.call(args);
			}
		}
	}

	/**
	 * @param {IRExprStack} stack
	 * @returns {IRExpr}
	 */
	inline(stack) {
		return new IRUserCallExpr(this.#fnExpr.inline(stack), super.simplifyArgs(stack, true), this.parensSite);
	}

	/**
	 * Inlines arguments that are only used once in fnExpr.
	 * Also eliminates unused arguments
	 * @param {IRExprStack} stack
	 * @param {IRExpr} fnExpr - already simplified
	 * @param {IRExpr[]} argExprs - already simplified
	 * @returns {?IRExpr} - returns null if it isn't simpler
	 */
	inlineArgs(stack, fnExpr, argExprs) {
		// inline single use vars, and eliminate unused vars
		if (fnExpr instanceof IRFuncExpr) {
			/**
			 * @type {IRVariable[]}
			 */
			let remVars = [];

			/**
			 * @type {IRExpr[]}
			 */
			let remArgExprs = [];

			let inlineStack = new IRExprStack();

			for (let i = 0; i < fnExpr.args.length; i++) {
				let variable = fnExpr.args[i];
				let nRefs = fnExpr.countRefs(variable);
				let argExpr = argExprs[i];

				if (nRefs == 0) {
					// don't add
				} else if (nRefs == 1 || argExpr instanceof IRNameExpr) {
					// inline for sure
					inlineStack.setInline(variable, argExpr);
				} else {
					remVars.push(variable);
					remArgExprs.push(argExpr);
				}
			}

			if (remArgExprs.length < argExprs.length || remArgExprs.length == 0) {
				if (remArgExprs.length == 0) {
					return fnExpr.inline(inlineStack).simplify(stack).body;
				} else {
					return new IRUserCallExpr(new IRFuncExpr(fnExpr.site, remVars, fnExpr.inline(inlineStack).simplify(stack).body), remArgExprs, this.parensSite);
				}
			}
		}

		return null;
	}

	/**
	 * Inline all literal args if the resulting expression is an improvement over the current expression
	 * @param {IRExprStack} stack
	 * @param {IRExpr} fnExpr - already simplified
	 * @param {IRExpr[]} argExprs - already simplified
	 * @returns {?IRExpr} - returns null if it isn't simpler
	 */
	inlineLiteralArgs(stack, fnExpr, argExprs) {
		if (fnExpr instanceof IRFuncExpr) {
			let inlineStack = new IRExprStack();

			/**
			 * @type {IRVariable[]}
			 */
			let remVars = [];

			/**
			 * @type {IRExpr[]}
			 */
			let remArgs = [];

			let argVariables = fnExpr.args;

			for (let i = 0; i < argVariables.length; i++) {
				let v = argVariables[i];
				let argExpr = argExprs[i];
				if (argExpr instanceof IRLiteral) {
					inlineStack.setInline(v, argExpr);
				} else {
					remVars.push(v);
					remArgs.push(argExpr);
				}
			}

			if (remVars.length < argVariables.length) {
				let that = new IRUserCallExpr(new IRFuncExpr(fnExpr.site, remVars, fnExpr.body.inline(inlineStack).simplify(stack)), remArgs, this.parensSite);

				if (that.calcSize() <= this.calcSize()) {
					return that;
				}
			}
		}
		
		return null;
	}

	/**
	 * Simplify some specific builtin functions
	 * @param {IRExprStack} stack
	 * @param {IRExpr} fnExpr
	 * @param {IRExpr[]} argExprs
	 * @returns {?IRExpr}
	 */
	simplifyTopology(stack, fnExpr, argExprs) {
		if (fnExpr instanceof IRNameExpr) {
			switch (fnExpr.name) {
				case "__helios__common__boolData": {
						// check if arg is a call to __helios__common__unBoolData
						let argExpr = argExprs[0];
						if (argExpr instanceof IRUserCallExpr && argExpr.fnExpr instanceof IRNameExpr && argExpr.fnExpr.name == "__helios__common__unBoolData") {
							return argExpr.argExprs[0];
						}
					}
					break;
				case "__helios__common__unBoolData": {
						// check if arg is a call to __helios__common__boolData
						let argExpr = argExprs[0];
						if (argExpr instanceof IRUserCallExpr && argExpr.fnExpr instanceof IRNameExpr && argExpr.fnExpr.name == "__helios__common__boolData") {
							return argExpr.argExprs[0];
						}
					}
					break;
				case "__helios__common__concat": {
						// check if either 1st or 2nd arg is the empty list
						let a = argExprs[0];
						if (a instanceof IRLiteral && a.value instanceof PlutusCoreList && a.value.list.length == 0) {
							return argExprs[1];
						} else if (a instanceof IRLiteral && a.value instanceof PlutusCoreMap && a.value.map.length == 0) {
							return argExprs[1];
						} else {
							let b = argExprs[1];
							if (b instanceof IRLiteral && b.value instanceof PlutusCoreList && b.value.list.length == 0) {
								return argExprs[0];
							} else if (b instanceof IRLiteral && b.value instanceof PlutusCoreMap && b.value.map.length == 0) {
								return argExprs[0];
							}
						}
					}
					break;
			}
		}

		return null;
	}

	/**
	 * Evaluates fnExpr if all args are literals
	 * Otherwise returns null
	 * @param {IRExprStack} stack
	 * @param {IRExpr} fnExpr
	 * @param {IRExpr[]} argExprs
	 * @returns {?IRExpr}
	 */
	simplifyLiteral(stack, fnExpr, argExprs) {
		let callExpr = new IRUserCallExpr(fnExpr, argExprs, this.parensSite);
		
		let callStack = stack.initCallStack();
		
		let res = callExpr.eval(callStack);

		if (res === null) {
			return null;
		} else {
			return res.value;
		}
	}

	/**
	 * @param {IRExprStack} stack
	 * @returns {IRExpr}
	 */
	simplify(stack = new IRExprStack()) {
		let argExprs = this.simplifyArgs(stack);

		{
			let maybeBetter = this.simplifyLiteral(stack, this.#fnExpr, this.argExprs);
			if (maybeBetter !== null && maybeBetter.calcSize() < this.calcSize()) {
				return maybeBetter;
			}
		}

		let innerStack = stack;

		if (this.#fnExpr instanceof IRFuncExpr) {
			assert(argExprs.length == this.#fnExpr.args.length);
			for (let i = 0; i < argExprs.length; i++) {
				let v = this.#fnExpr.args[i];
				innerStack = innerStack.set(v, argExprs[i]);
			}
		}

		let fnExpr = this.#fnExpr.simplify(innerStack);

		if (fnExpr instanceof IRNameExpr && fnExpr.name.startsWith("__core")) {
			return new IRCoreCallExpr(new Word(fnExpr.site, fnExpr.name), argExprs, this.parensSite);
		}

		{
			let maybeBetter = this.simplifyLiteral(stack, fnExpr, argExprs);
			if (maybeBetter !== null && maybeBetter.calcSize() < this.calcSize()) {
				return maybeBetter;
			}
		}

		{
			let maybeBetter = this.inlineArgs(stack, fnExpr, argExprs);
			if (maybeBetter !== null) {
				return maybeBetter;
			}
		}

		{
			let maybeBetter = this.inlineLiteralArgs(stack, fnExpr, argExprs);
			if (maybeBetter !== null) {
				return maybeBetter;
			}
		}

		{
			let maybeBetter = this.simplifyTopology(stack, fnExpr, argExprs);
			if (maybeBetter !== null) {
				return maybeBetter;
			}
		}

		return new IRUserCallExpr(fnExpr, argExprs, this.parensSite);
	}

	/**
	 * @returns {PlutusCoreTerm}
	 */
	toPlutusCore() {
		return super.toPlutusCoreCall(this.#fnExpr.toPlutusCore());
	}
}

/**
 * IR function call of core functions
 */
class IRCoreCallExpr extends IRCallExpr {
	#name;

	/**
	 * @param {Word} name 
	 * @param {IRExpr[]} argExprs 
	 * @param {Site} parensSite 
	 */
	constructor(name, argExprs, parensSite) {
		super(name.site, argExprs, parensSite);
		this.#name = name;
	}

	get builtinName() {
		return this.#name.toString().slice(8);
	}

	copy() {
		return new IRCoreCallExpr(this.#name, this.argExprs.map(a => a.copy()), this.parensSite);
	}

	/**
	 * @param {string} indent
	 * @returns {string}
	 */
	toString(indent = "") {
		return `${this.#name.toString()}(${this.argsToString()})`;
	}

	/**
	 * @param {IRScope} scope 
	 */
	resolveNames(scope = new IRScope(null, null)) {
		super.resolveNames(scope);
	}

	/**
	 * @param {string} builtinName
	 * @param {IRValue[]} args 
	 * @returns {?IRValue}
	 */
	static evalValues(builtinName, args) {
		if (builtinName == "ifThenElse") {
			let cond = args[0].value;
			if (cond !== null && cond.value instanceof PlutusCoreBool) {
				if (cond.value.bool) {
					return args[1];
				} else {
					return args[2];
				}
			} else {
				return null;
			}
		} else if (builtinName == "trace") {
			return args[1];
		} else {
			/**
			 * @type {PlutusCoreValue[]}
			 */
			let argValues = [];

			for (let arg of args) {
				if (arg.value !== null) {
					argValues.push(arg.value.value);
				} else {
					return null;
				}
			}

			try {
				let result = PlutusCoreBuiltin.evalStatic(new Word(Site.dummy(), builtinName), argValues);

				return new IRLiteralValue(new IRLiteral(result));
			} catch(e) {
				// runtime errors like division by zero are allowed
				if (e instanceof UserError && e.message.startsWith("RuntimeError")) {
					return null;
				} else {
					throw e;
				}
			}
		}
	}

	/**
	 * @param {IRCallStack} stack
	 * @returns {?IRValue}
	 */
	eval(stack) {
		let args = this.evalArgs(stack);

		if (args !== null) {
			return IRCoreCallExpr.evalValues(this.builtinName, args);
		}
		
		return null;
	}

	/**
	 * @param {IRExpr[]} argExprs
	 * @returns {?IRExpr}
	 */
	simplifyLiteralArgs(argExprs) {
		if (this.builtinName == "ifThenElse") {
			assert(argExprs.length == 3);
			let cond = argExprs[0];

			if (cond instanceof IRLiteral && cond.value instanceof PlutusCoreBool) {
				if (cond.value.bool) {
					return argExprs[1];
				} else {
					return argExprs[2];
				}
			} 
		} else if (this.builtinName == "trace") {
			assert(argExprs.length == 2);
			return argExprs[1];
		} else {
			// if all the args are literals -> return the result

			/**
			 * @type {PlutusCoreValue[]}
			 */
			let argValues = [];

			for (let arg of argExprs) {
				if (arg instanceof IRLiteral) {
					argValues.push(arg.value);
				} else {
					return null;
				}
			}

			try {
				let result = PlutusCoreBuiltin.evalStatic(new Word(this.#name.site, this.builtinName), argValues);

				return new IRLiteral(result);
			} catch(e) {
				if (!(e instanceof UserError)) { 
					throw e;
				}
			}
		}
		
		return null;
	}

	/**
	 * @param {IRExpr[]} argExprs
	 * @returns {?IRExpr}
	 */
	simplifyTopology(argExprs) {
		switch (this.builtinName) {			
			case "encodeUtf8":
				// we can't eliminate a call to decodeUtf8, as it might throw some errors
				break;
			case "decodeUtf8": {
					// check if arg is a call to encodeUtf8
					let argExpr = argExprs[0];
					if (argExpr instanceof IRCoreCallExpr && argExpr.builtinName == "encodeUtf8") {
						return argExpr.argExprs[0];
					}
				}
				break;
			case "ifThenElse": {
					// check if first arg evaluates to constant condition
					let cond = argExprs[0];
					if (cond instanceof IRLiteral && cond.value instanceof PlutusCoreBool) {
						return cond.value.bool ? argExprs[1] : argExprs[2];
					}
				}
				break;
			case "addInteger": {
					// check if first or second arg evaluates to 0
					let a = argExprs[0];
					if (a instanceof IRLiteral && a.value instanceof PlutusCoreInt && a.value.int == 0n) {
						return argExprs[1];
					} else {
						let b = argExprs[1];
						if (b instanceof IRLiteral && b.value instanceof PlutusCoreInt && b.value.int == 0n) {
							return argExprs[0];
						}
					}
				}
				break;
			case "subtractInteger": {
					// check if second arg evaluates to 0
					let b = argExprs[1];
					if (b instanceof IRLiteral && b.value instanceof PlutusCoreInt && b.value.int == 0n) {
						return argExprs[0];
					}
				}
				break;
			case "multiplyInteger": {
					// check if first arg is 0 or 1
					let a = argExprs[0];
					if (a instanceof IRLiteral && a.value instanceof PlutusCoreInt) {
						if (a.value.int == 0n) {
							return a;
						} else if (a.value.int == 1n) {
							return argExprs[1];
						}
					} else {
						let b = argExprs[1];
						if (b instanceof IRLiteral && b.value instanceof PlutusCoreInt) {
							if (b.value.int == 0n) {
								return b;
							} else if (b.value.int == 1n) {
								return argExprs[0];
							}
						}
					}
				}
				break;
			case "divideInteger": {
					// check if second arg is 1
					let b = argExprs[1];
					if (b instanceof IRLiteral && b.value instanceof PlutusCoreInt && b.value.int == 1n) {
						return argExprs[0];
					}
				}
				break;
			case "modInteger": {
					// check if second arg is 1
					let b = argExprs[1];
					if (b instanceof IRLiteral && b.value instanceof PlutusCoreInt && b.value.int == 1n) {
						return new IRLiteral(new PlutusCoreInt(this.site, 0n));
					}
				}
				break;
			case "appendByteString": {
					// check if either 1st or 2nd arg is the empty bytearray
					let a = argExprs[0];
					if (a instanceof IRLiteral && a.value instanceof PlutusCoreByteArray && a.value.bytes.length == 0) {
						return argExprs[1];
					} else {
						let b = argExprs[1];
						if (b instanceof IRLiteral && b.value instanceof PlutusCoreByteArray && b.value.bytes.length == 0) {
							return argExprs[0];
						}
					}
				}
				break;
			case "appendString": {
					// check if either 1st or 2nd arg is the empty string
					let a = argExprs[0];
					if (a instanceof IRLiteral && a.value instanceof PlutusCoreString && a.value.string.length == 0) {
						return argExprs[1];
					} else {
						let b = argExprs[1];
						if (b instanceof IRLiteral && b.value instanceof PlutusCoreString && b.value.string.length == 0) {
							return argExprs[0];
						}
					}
				}
				break;
			case "trace":
				return argExprs[1];
			case "unIData": {
					// check if arg is a call to iData
					let argExpr = argExprs[0];
					if (argExpr instanceof IRCoreCallExpr && argExpr.builtinName == "iData") {
						return argExpr.argExprs[0];
					}
				}
				break;
			case "iData": {
					// check if arg is a call to unIData
					let argExpr = argExprs[0];
					if (argExpr instanceof IRCoreCallExpr && argExpr.builtinName == "unIData") {
						return argExpr.argExprs[0];
					}
				}
				break;
			case "unBData": {
					// check if arg is a call to bData
					let argExpr = argExprs[0];
					if (argExpr instanceof IRCoreCallExpr && argExpr.builtinName == "bData") {
						return argExpr.argExprs[0];
					}
				}
				break;
			case "bData": {
					// check if arg is a call to unBData
					let argExpr = argExprs[0];
					if (argExpr instanceof IRCoreCallExpr && argExpr.builtinName == "unBData") {
						return argExpr.argExprs[0];
					}
				}
				break;
			case "unMapData": {
					// check if arg is call to mapData
					let argExpr = argExprs[0];
					if (argExpr instanceof IRCoreCallExpr && argExpr.builtinName == "mapData") {
						return argExpr.argExprs[0];
					}
				}
				break;
			case "mapData": {
					// check if arg is call to unMapData
					let argExpr = argExprs[0];
					if (argExpr instanceof IRCoreCallExpr && argExpr.builtinName == "unMapData") {
						return argExpr.argExprs[0];
					}
				}
				break;
			case "listData": {
					// check if arg is call to unListData
					let argExpr = argExprs[0];
					if (argExpr instanceof IRCoreCallExpr && argExpr.builtinName == "unListData") {
						return argExpr.argExprs[0];
					}
				}
				break;
			case "unListData": {
					// check if arg is call to listData
					let argExpr = argExprs[0];
					if (argExpr instanceof IRCoreCallExpr && argExpr.builtinName == "listData") {
						return argExpr.argExprs[0];
					}
				}
				break;
		}

		return null;
	}

	/**
	 * @param {IRExprStack} stack
	 * @returns {IRExpr}
	 */
 	inline(stack) {
		return new IRCoreCallExpr(this.#name, super.simplifyArgs(stack, true), this.parensSite);
	}

	/**
	 * @param {IRExprStack} stack
	 * @returns {IRExpr}
	 */
	simplify(stack = new IRExprStack()) {
		let argExprs = super.simplifyArgs(stack);

		{
			let maybeBetter = this.simplifyLiteralArgs(argExprs);
			if (maybeBetter !== null) {
				return maybeBetter;
			}
		}

		{
			let maybeBetter = this.simplifyTopology(argExprs);
			if (maybeBetter !== null) {
				return maybeBetter;
			}
		}
		
		return new IRCoreCallExpr(this.#name, argExprs, this.parensSite);
	}

	/**
	 * @param {Site} site
	 * @param {string} name - full name of builtin, including prefix
	 * @returns {PlutusCoreTerm}
	 */
	static newPlutusCoreBuiltin(site, name) {
		/**
		 * @type {PlutusCoreTerm}
		 */
		 let term = new PlutusCoreBuiltin(site, name.slice("__core__".length));

		 let nForce = PLUTUS_CORE_BUILTINS[IRScope.findBuiltin(name)].forceCount;
 
		 for (let i = 0; i < nForce; i++) {
			 term = new PlutusCoreForce(site, term);
		 }
 
		 return term;
	}

	/**
	 * @returns {PlutusCoreTerm}
	 */
	toPlutusCore() {
		let term = IRCoreCallExpr.newPlutusCoreBuiltin(this.site, this.#name.value);

		return this.toPlutusCoreCall(term);
	}
}

/**
 * Intermediate Representation error call (with optional literal error message)
 */
class IRErrorCallExpr extends IRExpr {
	#msg;

	/**
	 * @param {Site} site 
	 * @param {string} msg 
	 */
	constructor(site, msg = "") {
		super(site);
		this.#msg = msg;
	}

	copy() {
		return new IRErrorCallExpr(this.site, this.#msg);
	}

	/**
	 * @param {string} indent 
	 * @returns {string}
	 */
	toString(indent = "") {
		return "error()";
	}

	/**
	 * @param {IRScope} scope 
	 */
	resolveNames(scope) {
	}

	/**
	 * @param {IRVariable} ref
	 * @returns {number}
	 */
	countRefs(ref) {
		return 0;
	}

	/**
	 * @param {IRCallStack} stack
	 * @returns {?IRValue}
	 */
	eval(stack) {
		return null;
	}

	/**
	 * @param {IRExprStack} stack
	 * @returns {IRExpr}
	 */
	inline(stack) {
		return this;
	}

	/**
	 * @param {IRExprStack} stack
	 * @returns {IRExpr}
	 */
	simplify(stack) {
		return this;
	}

	/**
	 * @returns {PlutusCoreTerm}
	 */
	toPlutusCore() {
		return new PlutusCoreError(this.site, this.#msg);
	}
}

/**
 * Wrapper for IRFuncExpr, IRCallExpr or IRLiteral
 */
class IRProgram {
	#expr;

	/**
	 * @param {IRFuncExpr | IRCallExpr | IRLiteral} expr
	 */
	constructor(expr) {
		this.#expr = expr;
	}

	/**
	 * @param {IR} ir 
	 * @param {boolean} simplify
	 * @returns {IRProgram}
	 */
	static new(ir, simplify = false) {
		let [irSrc, codeMap] = ir.generateSource();

		let irTokens = tokenizeIR(irSrc, codeMap);

		let expr = buildIRExpr(irTokens);

		
		/**
		 * @type {IRProgram}
		 */
		if (expr instanceof IRFuncExpr || expr instanceof IRCallExpr || expr instanceof IRLiteral) {
			if (expr instanceof IRFuncExpr || expr instanceof IRUserCallExpr || expr instanceof IRCoreCallExpr) {
				expr.resolveNames();
			}

			let program = new IRProgram(expr);

			if (simplify) {
				program.simplify();
			}

			return program;
		} else {
			throw new Error("expected IRFuncExpr or IRUserCallExpr or IRLiteral as result of IRProgram.new");
		}
	}

	get site() {
		return this.#expr.site;
	}

	/**
	 * @type {PlutusCoreData}
	 */
	get data() {
		if (this.#expr instanceof IRLiteral) {
			let v = this.#expr.value;

			return v.data;
		} else {
			console.log(this.#expr.toString());
			throw new Error("expected data literal");
		}
	}

	toString() {
		return this.#expr.toString();
	}

	simplify() {
		let dirty = true;
	
		//console.log(new Source(program.toString()).pretty());	
	
		while(dirty && (this.#expr instanceof IRFuncExpr || this.#expr instanceof IRUserCallExpr || this.#expr instanceof IRCoreCallExpr)) {
			dirty = false;
			let newExpr = this.#expr.simplify();
	
			if (newExpr instanceof IRFuncExpr || newExpr instanceof IRUserCallExpr || newExpr instanceof IRCoreCallExpr || newExpr instanceof IRLiteral) {
				dirty = newExpr.toString() != this.#expr.toString();
				this.#expr = newExpr;
			}
		}
	
		if (this.#expr instanceof IRFuncExpr || this.#expr instanceof IRUserCallExpr || this.#expr instanceof IRCoreCallExpr) {
			// recalculate the Debruijn indices
			this.#expr.resolveNames();
		}
	}

	/**
	 * @returns {PlutusCoreProgram}
	 */
	toPlutusCore() {
		return new PlutusCoreProgram(this.#expr.toPlutusCore());
	}

	/**
	 * @returns {number}
	 */
	calcSize() {
		return this.toPlutusCore().calcSize();
	}
}


//////////////////////////////////////////
// Section 16: IR AST build functions
//////////////////////////////////////////

/**
 * Build an Intermediate Representation expression
 * @param {Token[]} ts 
 * @returns {IRExpr}
 */
function buildIRExpr(ts) {
	/** @type {?IRExpr} */
	let expr = null;

	while (ts.length > 0) {
		let t = ts.shift();

		if (t === undefined) {
			throw new Error("unexpected");
		} else {
			if (t.isGroup("(") && ts.length > 0 && ts[0].isSymbol("->")) {
				assert(expr === null);

				ts.unshift(t);

				expr = buildIRFuncExpr(ts);
			} else if (t.isGroup("(")) {
				let group = t.assertGroup();

				if (expr === null) {
					if (group.fields.length == 1) {
						expr = buildIRExpr(group.fields[0])
					} else if (group.fields.length == 0) {
						expr = new IRLiteral(new PlutusCoreUnit(t.site));
					} else {
						group.syntaxError("unexpected parentheses with multiple fields");
					}
				} else {
					let args = [];
					for (let f of group.fields) {
						args.push(buildIRExpr(f));
					}

					if (expr instanceof IRNameExpr && expr.name.startsWith("__core")) {
						if (!IRScope.isBuiltin(expr.name)) {
							throw expr.site.referenceError(`builtin '${expr.name}' undefined`);
						}

						expr = new IRCoreCallExpr(new Word(expr.site, expr.name), args, t.site);
					} else {
						expr = new IRUserCallExpr(expr, args, t.site);
					}
				}
			} else if (t.isSymbol("-")) {
				// only makes sense next to IntegerLiterals
				let int = assertDefined(ts.shift());
				if (int instanceof IntLiteral) {
					expr = new IRLiteral(new PlutusCoreInt(int.site, int.value * (-1n)));
				} else {
					throw int.site.typeError(`expected literal int, got ${int}`);
				}
			} else if (t instanceof BoolLiteral) {
				assert(expr === null);
				expr = new IRLiteral(new PlutusCoreBool(t.site, t.value));
			} else if (t instanceof IntLiteral) {
				assert(expr === null);
				expr = new IRLiteral(new PlutusCoreInt(t.site, t.value));
			} else if (t instanceof ByteArrayLiteral) {
				assert(expr === null);
				expr = new IRLiteral(new PlutusCoreByteArray(t.site, t.bytes));
			} else if (t instanceof StringLiteral) {
				assert(expr === null);
				expr = new IRLiteral(new PlutusCoreString(t.site, t.value));
			} else if (t.isWord("__core__error")) {
				assert(expr === null);

				let maybeGroup = ts.shift();
				if (maybeGroup === undefined) {
					throw t.site.syntaxError("expected parens after __core__error");
				} else {
					let parens = maybeGroup.assertGroup("(", 1);
					let pts = parens.fields[0];

					if (pts.length != 1) {
						throw parens.syntaxError("error call expects a single literal string msg arg");
					}

					let msg = pts[0];
					if (!(msg instanceof StringLiteral)) {
						throw msg.syntaxError("error call expects literal string msg arg");
					}
					expr = new IRErrorCallExpr(t.site, msg.value);
				}
			} else if (t.isWord()) {
				assert(expr === null);
				expr = new IRNameExpr(t.assertWord());
			} else {
				throw new Error("unhandled untyped token " + t.toString());
			}
		}
	}

	if (expr === null) {
		throw new Error("expr is null");
	} else {
		return expr;
	}
}

/**
 * Build an IR function expression
 * @param {Token[]} ts 
 * @returns {IRFuncExpr}
 */
function buildIRFuncExpr(ts) {
	let maybeParens = ts.shift();
	if (maybeParens === undefined) {
		throw new Error("empty func expr");
	} else {
		let parens = maybeParens.assertGroup("(");

		assertDefined(ts.shift()).assertSymbol("->");
		let braces = assertDefined(ts.shift()).assertGroup("{");

		/**
		 * @type {Word[]}
		 */
		let argNames = [];

		for (let f of parens.fields) {
			assert(f.length == 1, "expected single word per arg");
			argNames.push(f[0].assertWord());
		}

		if (braces.fields.length > 1) {
			throw braces.syntaxError("unexpected comma in function body")
		} else if (braces.fields.length == 0) {
			throw braces.syntaxError("empty function body")
		}

		let bodyExpr = buildIRExpr(braces.fields[0]);

		return new IRFuncExpr(parens.site, argNames.map(a => new IRVariable(a)), bodyExpr)
	}
}


//////////////////////////////////////////
// Section 17: Plutus-Core deserialization
//////////////////////////////////////////

/**
 * PlutusCore deserializer creates a PlutusCore form an array of bytes
 */
class PlutusCoreDeserializer extends BitReader {
	
	/**
	 * @param {number[]} bytes 
	 */
	constructor(bytes) {
		super(bytes);
	}

	/**
	 * @param {string} category 
	 * @returns {number}
	 */
	tagWidth(category) {
		assert(category in PLUTUS_CORE_TAG_WIDTHS, `unknown tag category ${category.toString()}`);

		return PLUTUS_CORE_TAG_WIDTHS[category];
	}

	/**
	 * Returns the name of a known builtin
	 * Returns the integer id if id is out of range (thus if the builtin is unknown)
	 * @param {number} id
	 * @returns {string | number}
	 */
	builtinName(id) {
		let all = PLUTUS_CORE_BUILTINS;

		if (id >= 0 && id < all.length) {
			return all[id].name;
		} else {
			console.error(`Warning: builtin id ${id.toString()} out of range`);

			return id;
		}
	}

	/**
	 * Reads a PlutusCore list with a specified size per element
	 * Calls itself recursively until the end of the list is reached
	 * @param {number} elemSize 
	 * @returns {number[]}
	 */
	readLinkedList(elemSize) {
		// Cons and Nil constructors come from Lisp/Haskell
		//  cons 'a' creates a linked list node,
		//  nil      creates an empty linked list
		let nilOrCons = this.readBits(1);

		if (nilOrCons == 0) {
			return [];
		} else {
			return [this.readBits(elemSize)].concat(this.readLinkedList(elemSize));
		}
	}

	/**
	 * Reads a single PlutusCoreTerm
	 * @returns {PlutusCoreTerm}
	 */
	readTerm() {
		let tag = this.readBits(this.tagWidth("term"));

		switch (tag) {
			case 0:
				return this.readVariable();
			case 1:
				return this.readDelay();
			case 2:
				return this.readLambda();
			case 3:
				return this.readCall(); // aka function application
			case 4:
				return this.readConstant();
			case 5:
				return this.readForce();
			case 6:
				return new PlutusCoreError(Site.dummy());
			case 7:
				return this.readBuiltin();
			default:
				throw new Error("term tag " + tag.toString() + " unhandled");
		}
	}

	/**
	 * Reads a single unbounded integer
	 * @param {boolean} signed 
	 * @returns {PlutusCoreInt}
	 */
	readInteger(signed = false) {
		let bytes = [];

		let b = this.readByte();
		bytes.push(b);

		while (!PlutusCoreInt.rawByteIsLast(b)) {
			b = this.readByte();
			bytes.push(b);
		}

		// strip the leading bit
		let res = new PlutusCoreInt(Site.dummy(), PlutusCoreInt.bytesToBigInt(bytes.map(b => PlutusCoreInt.parseRawByte(b))), false); // raw int is unsigned

		if (signed) {
			res = res.toSigned(); // unzigzag is performed here
		}

		return res;
	}

	/**
	 * Reads bytearray or string characters
	 * @returns {number[]}
	 */
	readChars() {
		this.moveToByteBoundary(true);

		let bytes = [];

		let nChunk = this.readByte();

		while (nChunk > 0) {
			for (let i = 0; i < nChunk; i++) {
				bytes.push(this.readByte());
			}

			nChunk = this.readByte();
		}

		return bytes;
	}

	/**
	 * Reads a literal bytearray
	 * @returns {PlutusCoreByteArray}
	 */
	readByteArray() {
		let bytes = this.readChars();

		return new PlutusCoreByteArray(Site.dummy(), bytes);
	}

	/**
	 * Reads a literal string
	 * @returns {PlutusCoreString}
	 */
	readString() {
		let bytes = this.readChars();

		let s = bytesToString(bytes);

		return new PlutusCoreString(Site.dummy(), s);
	}

	/**
	 * Reads a variable term
	 * @returns {PlutusCoreVariable}
	 */
	readVariable() {
		let index = this.readInteger()

		return new PlutusCoreVariable(Site.dummy(), index);
	}

	/**
	 * Reads a lambda expression term
	 * @returns {PlutusCoreLambda}
	 */
	readLambda() {
		let rhs = this.readTerm();

		return new PlutusCoreLambda(Site.dummy(), rhs);
	}

	/**
	 * Reads a function application term
	 * @returns {PlutusCoreCall}
	 */
	readCall() {
		let a = this.readTerm();
		let b = this.readTerm();

		return new PlutusCoreCall(Site.dummy(), a, b);
	}

	/**
	 * Reads a single constant
	 * @returns {PlutusCoreConst}
	 */
	readConstant() {
		let typeList = this.readLinkedList(this.tagWidth("constType"));

		let res = this.readTypedConstant(typeList);

		assert(typeList.length == 0);

		return res;
	}

	/**
	 * Reads a single constant (recursive types not yet handled)
	 * @param {number[]} typeList 
	 * @returns {PlutusCoreConst}
	 */
	readTypedConstant(typeList) {
		let type = assertDefined(typeList.shift());

		assert(typeList.length == 0, "recursive types not yet handled");

		/** @type {PlutusCoreValue} */
		let inner;

		switch (type) {
			case 0: // signed Integer
				inner = this.readInteger();
				break;
			case 1: // bytearray
				inner = this.readByteArray();
				break;
			case 2: // utf8-string
				inner = this.readString();
				break;
			case 3:
				inner = new PlutusCoreUnit(Site.dummy()); // no reading needed
				break;
			case 4: // Bool
				inner = new PlutusCoreBool(Site.dummy(), this.readBits(1) == 1);
				break;
			default:
				throw new Error("unhandled constant type " + type.toString());
		}

		return new PlutusCoreConst(inner);
	}

	/**
	 * Reads a delay term
	 * @returns {PlutusCoreDelay}
	 */
	readDelay() {
		let expr = this.readTerm();

		return new PlutusCoreDelay(Site.dummy(), expr);
	}

	/**
	 * Reads a force term
	 * @returns {PlutusCoreForce}
	 */
	readForce() {
		let expr = this.readTerm();

		return new PlutusCoreForce(Site.dummy(), expr);
	}

	/**
	 * Reads a builtin function ref term
	 * @returns {PlutusCoreBuiltin}
	 */
	readBuiltin() {
		let id = this.readBits(this.tagWidth("builtin"));

		let name = this.builtinName(id);

		return new PlutusCoreBuiltin(Site.dummy(), name);
	}

	/**
	 * Move to the next byteboundary
	 * (and check that we are at the end)
	 */
	finalize() {
		this.moveToByteBoundary(true);
	}
}

/**
 * @param {number[]} bytes 
 * @returns {PlutusCoreProgram}
 */
function deserializePlutusCoreBytes(bytes) {
	let reader = new PlutusCoreDeserializer(bytes);

	let version = [
		reader.readInteger(),
		reader.readInteger(),
		reader.readInteger(),
	];

	let versionKey = version.map(v => v.toString()).join(".");

	if (versionKey != PLUTUS_CORE_VERSION) {
		console.error(`Warning: Plutus-Core script doesn't match version of Helios (expected ${PLUTUS_CORE_VERSION}, got ${versionKey})`);
	}

	let expr = reader.readTerm();

	reader.finalize();

	return new PlutusCoreProgram(expr, version);
}

/**
 * Parses a plutus core program. Returns a PlutusCoreProgram object
 * @param {string} jsonString 
 * @returns {PlutusCoreProgram}
 */
export function deserializePlutusCore(jsonString) {
	let obj = JSON.parse(jsonString);

	if (!("cborHex" in obj)) {
		throw UserError.syntaxError(new Source(jsonString), 0, "cborHex field not in json")
	}

	let cborHex = obj.cborHex;
	if (typeof cborHex !== "string") {
		let src = new Source(jsonString);
		let re = /cborHex/;
		let cborHexMatch = jsonString.match(re);
		if (cborHexMatch === null) {
			throw UserError.syntaxError(src, 0, "'cborHex' key not found");
		} else {
			throw UserError.syntaxError(src, jsonString.search(re), "cborHex not a string");
		}
	}

	let bytes = unwrapCBORBytes(unwrapCBORBytes(hexToBytes(cborHex)));

	return deserializePlutusCoreBytes(bytes);
}

//////////////////////////
// 18. Transaction objects
//////////////////////////

export class Tx extends CBORData {
	#body;
	#witnesses;
	#valid;

	// the following fields aren't used by the serialization (only for building)
	/** @type {?Address} */
	#changeAddress;

	constructor() {
		super();
		this.#body = new TxBody();
		this.#witnesses = new TxWitnesses();
		this.#valid = false; // building is only possible if valid==false
		// no auxiliary data for now

		this.#changeAddress = null;
	}

	/**
	 * @returns {number[]}
	 */
	toCBOR() {
		return CBORData.encodeTuple([
			this.#body.toCBOR(),
			this.#witnesses.toCBOR(),
			CBORData.encodeBool(this.#valid),
			CBORData.encodeNull(),
		]);
	}

	/**
	 * @param {number[]} bytes 
	 * @returns {Tx}
	 */
	static fromCBOR(bytes) {
		bytes = bytes.slice();

		let tx = new Tx();

		let n = CBORData.decodeTuple(bytes, (i, fieldBytes) => {
			switch(i) {
				case 0:
					tx.#body = TxBody.fromCBOR(fieldBytes);
					break;
				case 1:
					tx.#witnesses = TxWitnesses.fromCBOR(fieldBytes);
					break;
				case 2:
					tx.#valid = CBORData.decodeBool(fieldBytes);
					break;
				case 3:
					CBORData.decodeNull(fieldBytes);
					break;
				default:
					throw new Error("bad tuple size");
			}
		});

		assert(n == 4);
		assert(bytes.length == 0);

		return tx;
	}
	
	/**
	 * @returns {Object}
	 */
	dump() {
		return {
			"body": this.#body.dump(),
			"witnesses": this.#witnesses.dump(),
			"valid": this.#valid ? "true" : "false",
		};
	}

	/**
	 * @param {Address} address 
	 * @returns {Tx}
	 */
	setChangeAddress(address) {
		assert(!this.#valid);

		this.#changeAddress = address;

		return this;
	}

	/**
	 * @param {bigint} slot
	 * @returns {Tx}
	 */
	setInvalidBefore(slot) {
		assert(!this.#valid);

		this.#body.setInvalidBefore(slot);

		return this;
	}

	/**
	 * @param {Hash} mph 
	 * @param {[number[], bigint][]} lst - list of pairs of [tokenName,amount]
	 * @param {PlutusCoreData} redeemer
	 * @returns {Tx}
	 */
	addMint(mph, lst, redeemer) {
		assert(!this.#valid);

		let idx = this.#body.addMint(mph, lst);

		this.#witnesses.addMintingRedeemer(idx, redeemer);

		return this;
	}

	/**
	 * @param {TxInput} input
	 * @param {?PlutusCoreData} redeemer
	 * @returns {Tx}
	 */
	addInput(input, redeemer = null) {
		assert(!this.#valid);

		if (input.origOutput === null) {
			throw new Error("TxInput.origOutput must be set when building transaction");
		} else {
			let id = this.#body.addInput(input);

			if (redeemer !== null) {
				assert(input.origOutput.address.validatorHash !== null, "input isn't locked by a script");

				this.#witnesses.addSpendingRedeemer(id, redeemer);

				if (input.origOutput.datum === null) {
					throw new Error("expected non-null datum");
				} else {
					let datum = input.origOutput.datum;

					if (datum instanceof OutputDatumHash) {
						let datumData = datum.data;
						if (datumData === null) {
							throw new Error("expected non-null datum data");
						} else {
							this.#witnesses.addDatumData(datumData);
						}
					}
				}
			} else {
				assert(input.origOutput.address.pubKeyHash !== null, "input is locked by a script, but redeemer isn't specified");
			}
		}

		return this;
	}

	/**
	 * @param {TxInput} input 
	 * @returns {Tx}
	 */
	addRefInput(input) {
		assert(!this.#valid);

		this.#body.addRefInput(input);

		return this;
	}

	/**
	 * @param {TxOutput} output 
	 * @returns {Tx}
	 */
	addOutput(output) {
		assert(!this.#valid);
		
		// min lovelace is checked during build, because 
		this.#body.addOutput(output);

		return this;
	}

	/**
	 * @param {Hash} hash
	 * @returns {Tx}
	 */
	addRequiredSignatory(hash) {
		assert(!this.#valid);

		this.#body.addRequiredSignatory(hash);

		return this;
	}

	/**
	 * Unused scripts are detected during build(), in which case an error is thrown
	 * @param {PlutusCoreProgram} program
	 * @returns {Tx}
	 */
	addScript(program) {
		assert(!this.#valid);

		this.#witnesses.addScript(program);

		return this;
	}

	/**
	 * Only one collateral input is required
	 * @param {TxInput} input 
	 * @returns {Tx}
	 */
	setCollateralInput(input) {
		assert(!this.#valid);

		this.#body.setCollateralInput(input);

		return this;
	}

	/**
	 * @param {NetworkParams} networkParams
	 * @returns {bigint}
	 */
	estimateFee(networkParams) {
		let [a, b] = networkParams.txFeeParams;

		if (!this.#valid) {
			// add dummy signatures
			let nUniquePubKeyHashes = this.#body.countUniqueSignatories();
			
			this.#witnesses.addDummySignatures(nUniquePubKeyHashes);
		}

		let size = this.toCBOR().length;

		if (!this.#valid) {
			this.#witnesses.removeDummySignatures();
		}

		let sizeFee = BigInt(a) + BigInt(size)*BigInt(b);

		let exFee = this.#witnesses.estimateFee(networkParams);

		return sizeFee + exFee;
	}

	/**
	 * Iterates until fee is exact
	 * @param {NetworkParams} networkParams
	 * @param {bigint} fee
	 * @returns {bigint}
	 */
	setFee(networkParams, fee) {
		let oldFee = this.#body.fee;

		while (oldFee != fee) {
			this.#body.setFee(fee);

			oldFee = fee;

			fee = this.estimateFee(networkParams);
		}

		return fee;
	}

	/**
	 * Checks that all necessary scripts are included, and that all included scripts are used
	 */
	checkScripts() {
		let scripts = this.#witnesses.scripts;

		/** @type {Set<string>} */
		let scriptHashSet = new Set();

		this.#body.collectScriptHashes(scriptHashSet);

		if (scriptHashSet.size < scripts.length) {
			throw new Error("too many scripts included");
		} else if (scriptHashSet.size > scripts.length) {
			throw new Error("missing scripts");
		}

		for (let script of scripts) {
			assert(scriptHashSet.has(bytesToHex(script.hash())), "missing script");
		}
	}

	/**
	 * @param {NetworkParams} networkParams 
	 * @returns {Promise<void>}
	 */
	async executeRedeemers(networkParams) {
		await this.#witnesses.executeRedeemers(networkParams, this.#body);
	}

	/**
	 * Calculates fee and balances transaction by sending an output back to changeAddress
	 * First assumes that change output isn't needed, and if that assumption doesn't result in a balanced transaction the change output is created.
	 * Iteratively increments the fee because the fee increase the tx size which in turn increases the fee (always converges within two steps though).
	 * Throws error if transaction can't be balanced.
	 * @param {NetworkParams} networkParams 
	 */
	balance(networkParams) {
		let fee = this.setFee(networkParams, this.estimateFee(networkParams));
		
		let inputValue = this.#body.sumInputAndMintedValue();

		let outputValue = this.#body.sumOutputValue();

		let feeValue = new MoneyValue(fee);

		let totalOutputValue = feeValue.add(outputValue);

		if (totalOutputValue.equals(inputValue)) {
			return;
		} else if (!inputValue.greaterOrEqualsThan(totalOutputValue)) { // strict gt for every asset kind
			console.log(inputValue.dump(), totalOutputValue.dump())
			throw new Error("transaction outputs more than it inputs");
		} else if (this.#changeAddress === null) {
			// if transaction isn't balanced we must add a change address

			throw new Error("change address not specified");
		}

		// use the change address to create a change utxo
		let diffValue = inputValue.sub(totalOutputValue);

		let changeOutput = new TxOutput(this.#changeAddress, diffValue); // also includes any minted change

		this.#body.addOutput(changeOutput);

		// we can mutate the lovelace value of 'changeOutput' until we have a balanced transaction with precisely the right fee

		let oldFee = fee;
		fee = this.estimateFee(networkParams);

		while (fee != oldFee) {
			this.#body.setFee(fee);

			let diff = fee - oldFee;

			if (diff  > changeOutput.value.lovelace) {
				throw new Error("not enough inputs to cover fees");
			}

			changeOutput.value.lovelace = changeOutput.value.lovelace - diff;

			oldFee = fee;

			fee = this.estimateFee(networkParams);
		}
	}

	/**
	 * @param {NetworkParams} networkParams 
	 */
	syncScriptDataHash(networkParams) {
		let hash = this.#witnesses.calcScriptDataHash(networkParams);

		if (hash !== null) {
			this.#body.setScriptDataHash(hash);
		}
	}

	/**
	 * Throws an error if there isn't enough collateral
	 * Also throws an error if the script doesn't require collateral, but collateral was actually included
	 * @param {NetworkParams} networkParams 
	 */
	checkCollateral(networkParams) {
		if (this.#witnesses.scripts.length > 0) {

			let minCollateralPct = networkParams.minCollateralPct;

			this.#body.checkCollateral(BigInt(Math.ceil(minCollateralPct*Number(this.#body.fee)/100.0)));
		} else {
			this.#body.checkCollateral(null);
		}
	}

	/**
	 * Throws error if tx is too big
	 * @param {NetworkParams} networkParams 
	 */
	checkSize(networkParams) {
		let size = this.toCBOR().length;

		if (size > networkParams.maxTxSize) {
			throw new Error("tx too big");
		}
	}

	/**
	 * Assumes transaction hasn't yet been signed by anyone (i.e. witnesses.pubKeyWitnesses is empty)
	 * @param {NetworkParams} networkParams
	 * @returns {Promise<void>}
	 */
	async build(networkParams) {
		assert(!this.#valid);

		this.checkScripts();

		// first do everything that might increase the size of the transaction		

		await this.executeRedeemers(networkParams);

		this.syncScriptDataHash(networkParams);

		this.balance(networkParams);

		this.#body.checkOutputs(networkParams);

		this.checkCollateral(networkParams);

		this.#witnesses.checkExecutionBudget(networkParams);

		this.checkSize(networkParams);

		this.#valid = true;
	}

	/**
	 * @param {PubKeyWitness} pubKeyWitness 
	 * @returns {Tx}
	 */
	addSignature(pubKeyWitness) {
		assert(this.#valid);

		pubKeyWitness.verifySignature(this.#body.toCBOR());

		this.#witnesses.addSignature(pubKeyWitness);

		return this;
	}
}

class TxBody extends CBORData {
	/** @type {TxInput[]} */
	#inputs;

	/** @type {TxOutput[]} */
	#outputs;

	/** @type {bigint} in lovelace */
	#fee;

	/** @type {?bigint} */
	#lastValidSlot;

	/** @type {DCert[]} */
	#certs;

	/** @type {Map<Address, bigint>} */
	#withdrawals;

	/** @type {?bigint} */
	#firstValidSlot;

	/** @type {MultiAsset} */
	#minted;

	/** @type {?Hash} */
	#scriptDataHash;

	/** @type {TxInput[]} */
	#collateral;

	/** @type {Hash[]} */
	#requiredSignatories;

	/** @type {?TxOutput} */
	#collateralReturn;

	/** @type {bigint} */
	#totalCollateral;

	/** @type {TxInput[]} */
	#refInputs;

	constructor() {
		super();

		this.#inputs = [];
		this.#outputs = [];
		this.#fee = 0n;
		this.#lastValidSlot = null;
		this.#certs	= [];
		this.#withdrawals = new Map();
		this.#firstValidSlot = null;
		this.#minted = new MultiAsset(); // starts as zero value (i.e. empty map)
		this.#scriptDataHash = null; // calculated upon finalization
		this.#collateral = [];
		this.#requiredSignatories = [];
		this.#collateralReturn = null; // doesn't seem to be used anymore
		this.#totalCollateral = 0n; // doesn't seem to be used anymore
		this.#refInputs = [];
	}

	get inputs() {
		return this.#inputs.slice();
	}

	get fee() {
		return this.#fee;
	}

	/**
	 * @param {bigint} fee
	 */
	setFee(fee) {
		this.#fee = fee;
	}

	get minted() {
		return this.#minted;
	}

	/**
	 * @returns {number[]}
	 */
	toCBOR() {
		/**
		 * @type {Map<number, number[]>}
		 */
		let object = new Map();

		object.set(0, CBORData.encodeDefList(this.#inputs));
		object.set(1, CBORData.encodeDefList(this.#outputs));
		object.set(2, CBORData.encodeInteger(this.#fee));
		
		if (this.#lastValidSlot !== null) {
			object.set(3, CBORData.encodeInteger(this.#lastValidSlot));
		}

		if (this.#certs.length != 0) {
			object.set(4, CBORData.encodeDefList(this.#certs));
		}

		if (this.#withdrawals.size != 0) {
			throw new Error("not yet implemented");
		}

		if (this.#firstValidSlot !== null) {
			object.set(8, CBORData.encodeInteger(this.#firstValidSlot));
		}

		if (!this.#minted.isZero()) {
			object.set(9, this.#minted.toCBOR());
		}

		if (this.#scriptDataHash !== null) {
			object.set(11, this.#scriptDataHash.toCBOR());
		}

		if (this.#collateral.length != 0) {
			object.set(13, CBORData.encodeDefList(this.#collateral));
		}

		if (this.#requiredSignatories.length != 0) {
			object.set(14, CBORData.encodeDefList(this.#requiredSignatories));
		}

		// what is NetworkId used for?
		//object.set(15, CBORData.encodeInteger(2n));

		if (this.#collateralReturn !== null) {
			object.set(16, this.#collateralReturn.toCBOR());
		}

		if (this.#totalCollateral > 0n) {
			object.set(17, CBORData.encodeInteger(this.#totalCollateral));
		}

		if (this.#refInputs.length != 0) {
			object.set(18, CBORData.encodeDefList(this.#refInputs));
		}

		return CBORData.encodeObject(object);
	}

	/**
	 * @param {number[]} bytes
	 * @returns {TxBody}
	 */
	static fromCBOR(bytes) {
		let txBody = new TxBody();

		let done = CBORData.decodeObject(bytes, (i, fieldBytes) => {
			switch(i) {
				case 0:
					CBORData.decodeList(fieldBytes, itemBytes => {
						txBody.#inputs.push(TxInput.fromCBOR(itemBytes));
					});
					break;
				case 1:
					CBORData.decodeList(fieldBytes, itemBytes => {
						txBody.#outputs.push(TxOutput.fromCBOR(itemBytes));
					})
					break;
				case 2:
					txBody.#fee = CBORData.decodeInteger(fieldBytes);
					break;
				case 3:
					txBody.#lastValidSlot = CBORData.decodeInteger(fieldBytes);
					break;
				case 4:
					CBORData.decodeList(fieldBytes, itemBytes => {
						txBody.#certs.push(DCert.fromCBOR(itemBytes));
					});
					break;
				case 5:
					throw new Error("not yet implemented");
				case 6:
					throw new Error("not yet implemented");
				case 7:
					throw new Error("not yet implemented");
				case 8:
					txBody.#firstValidSlot = CBORData.decodeInteger(fieldBytes);
					break;
				case 9:
					txBody.#minted = MultiAsset.fromCBOR(fieldBytes);
					break;
				case 10:
					throw new Error("unhandled field");
				case 11:
					txBody.#scriptDataHash = Hash.fromCBOR(fieldBytes);
					break;
				case 12:
					throw new Error("unhandled field");
				case 13:
					CBORData.decodeList(fieldBytes, itemBytes => {
						txBody.#collateral.push(TxInput.fromCBOR(itemBytes));
					});
					break;
				case 14:
					CBORData.decodeList(fieldBytes, itemBytes => {
						txBody.#requiredSignatories.push(Hash.fromCBOR(itemBytes));
					});
					break;
				case 15:
					assert(CBORData.decodeInteger(fieldBytes) == 2n);
					break;
				case 16:
					txBody.#collateralReturn = TxOutput.fromCBOR(fieldBytes);
					break;
				case 17:
					txBody.#totalCollateral = CBORData.decodeInteger(fieldBytes);
					break;
				case 18:
					CBORData.decodeList(fieldBytes, itemBytes => {
						txBody.#refInputs.push(TxInput.fromCBOR(fieldBytes));
					});
					break;
				default:
					throw new Error("unrecognized field");
			}
		});

		assert(done.has(0) && done.has(1) && done.has(2));

		return txBody;
	}

	/**
	 * @returns {Object}
	 */
	dump() {
		return {
			"inputs": this.#inputs.map(input => input.dump()),
			"outputs": this.#outputs.map(output => output.dump()),
			"fee": this.#fee.toString(),
			"lastValidSlot": this.#lastValidSlot === null ? null : this.#lastValidSlot.toString(),
			"firstValidSlot": this.#firstValidSlot === null ? null : this.#firstValidSlot.toString(),
			"minted": this.#minted.isZero() ? null : this.#minted.dump(),
			"scriptDataHash": this.#scriptDataHash === null ? null : this.#scriptDataHash.dump(),
			"collateral": this.#collateral.length == 0 ? null : this.#collateral.map(c => c.dump()),
			"requiredSignatories": this.#requiredSignatories.length == 0 ? null : this.#requiredSignatories.map(rs => rs.dump()),
			//"collateralReturn": this.#collateralReturn === null ? null : this.#collateralReturn.dump(), // doesn't seem to be used anymore
			//"totalCollateral": this.#totalCollateral.toString(), // doesn't seem to be used anymore
			"refInputs": this.#refInputs.map(ri => ri.dump()),
		};
	}

	/**
	 * For now simply returns minus infinity to plus infinity (WiP)
	 * @param {NetworkParams} networkParams
	 * @returns {ConstrData}
	 */
	toValidTimeRangeData(networkParams) {
		return new ConstrData(0, [
			new ConstrData(0, [ // LowerBound
				this.#firstValidSlot === null ? new ConstrData(0, []) : new ConstrData(1, [new IntData(networkParams.slotToTime(this.#firstValidSlot))]), // NegInf
				new ConstrData(1, []), // true
			]),
			new ConstrData(0, [ // UpperBound
				this.#lastValidSlot === null ? new ConstrData(2, []) : new ConstrData(1, [new IntData(networkParams.slotToTime(this.#lastValidSlot))]), // PosInf
				new ConstrData(1, []), // true
			]),
		]);
	}

	/**
	 * @param {NetworkParams} networkParams
	 * @param {Redeemer[]} redeemers
	 * @param {ListData} datums 
	 * @param {Hash} txId
	 * @returns {ConstrData}
	 */
	toTxData(networkParams, redeemers, datums, txId) {
		return new ConstrData(0, [
			new ListData(this.#inputs.map(input => input.toData())),
			new ListData(this.#outputs.map(output => output.toData())),
			(new MoneyValue(this.#fee)).toData(),
			this.#minted.toData(),
			new ListData(this.#certs.map(cert => cert.toData())),
			new MapData(Array.from(this.#withdrawals.entries()).map(w => [w[0].toStakingData(), new IntData(w[1])])),
			new MapData([]), // TODO: staking withdrawals
			this.toValidTimeRangeData(networkParams),
			new ListData(this.#requiredSignatories.map(rs => new ByteArrayData(rs.bytes))),
			new MapData(redeemers.map(r => [r.toScriptPurposeData(this), r.data])),
			new MapData(datums.list.map(d => [
				new ByteArrayData(Crypto.blake2b(d.toCBOR())), 
				d
			])),
			new ConstrData(0, [new ByteArrayData(txId.bytes)]),
		]);
	}

	/**
	 * @param {NetworkParams} networkParams 
	 * @param {Redeemer[]} redeemers
	 * @param {ListData} datums
	 * @param {number} redeemerIdx
	 * @returns {PlutusCoreData}
	 */
	toScriptContextData(networkParams, redeemers, datums, redeemerIdx) {		
		return new ConstrData(0, [
			// tx (we can't know the txId right now, because we don't know the execution costs yet, but a dummy txId should be fine)
			this.toTxData(networkParams, redeemers, datums, Hash.dummy()),
			redeemers[redeemerIdx].toScriptPurposeData(this),
		]);
	}

	/**
	 * @returns {MoneyValue}
	 */
	sumInputValue() {
		let sum = new MoneyValue();

		for (let input of this.#inputs) {
			if (input.origOutput !== null) {
				sum = sum.add(input.origOutput.value);
			}
		}

		return sum;
	}

	/**
	 * Throws error if any part of the sum is negative (i.e. more is burned than)
	 */
	sumInputAndMintedValue() {
		return this.sumInputValue().add(new MoneyValue(0n, this.#minted)).assertAllPositive();
	}

	/**
	 * @returns {MoneyValue}
	 */
	sumOutputValue() {
		let sum = new MoneyValue();

		for (let output of this.#outputs) {
			sum = sum.add(output.value);
		}

		return sum;
	}

	/**
	 * @param {bigint} slot
	 */
	setInvalidBefore(slot) {
		this.#firstValidSlot = slot;
	}

	/**
	 * @param {bigint} slot
	 */
	setInvalidAfter(slot) {
		this.#lastValidSlot = slot;
	}

	/**
	 * Throws error if this.#minted already contains mph
	 * @param {Hash} mph - minting policy hash
	 * @param {[number[], bigint][]} lst
	 * @returns {number} - index of entry
	 */
	addMint(mph, lst) {
		return this.#minted.addMintingPolicy(mph, lst);
	}

	/**
	 * @param {TxInput} input 
	 * @returns {number} - index of added input
	 */
	addInput(input) {
		if (input.origOutput === null) {
			throw new Error("TxInput.origOutput must be set when building transaction");
		} else {
			input.origOutput.value.assertAllPositive();
		}

		let idx = this.#inputs.length;

		this.#inputs.push(input);

		return idx;
	}

	/**
	 * @param {TxInput} input 
	 */
	addRefInput(input) {
		this.#refInputs.push(input);
	}

	/**
	 * @param {TxOutput} output
	 */
	addOutput(output) {
		output.value.assertAllPositive();

		this.#outputs.push(output);
	}

	/**
	 * @param {Hash} hash 
	 */
	addRequiredSignatory(hash) {
		this.#requiredSignatories.push(hash);
	}

	/**
	 * @param {TxInput} input 
	 */
	setCollateralInput(input) {
		this.#collateral = [input];
	}
	
	/**
	 * @param {Hash} scriptDataHash
	 */
	setScriptDataHash(scriptDataHash) {
		this.#scriptDataHash = scriptDataHash;
	}

	countUniqueSignatories() {
		/** @type {Set<Hash>} */
		let set = new Set();

		for (let input of this.#inputs) {
			let origOutput = input.origOutput;

			if (origOutput !== null) {
				let pubKeyHash = origOutput.address.pubKeyHash;

				if (pubKeyHash !== null) {
					set.add(pubKeyHash);
				}
			}
		}

		for (let rs of this.#requiredSignatories) {
			set.add(rs);
		}

		return set.size;
	}

	/**
	 * Script hashes are found in addresses of TxInputs and hashes of the minted MultiAsset
	 * @param {Set<string>} set - hashes in hex format
	 */
	collectScriptHashes(set) {
		for (let input of this.#inputs) {
			if (input.origOutput !== null) {
				let scriptHash = input.origOutput.address.validatorHash;

				if (scriptHash !== null) {
					set.add(bytesToHex(scriptHash.bytes));
				}
			}
		}

		let mphs = this.#minted.keys;

		for (let mph of mphs) {
			set.add(bytesToHex(mph.bytes));
		}
	}

	/**
	 * Checks that each output contains enough lovelace
	 * @param {NetworkParams} networkParams
	 */
	checkOutputs(networkParams) {
		let lovelacePerByte = networkParams.lovelacePerUTXOByte;

		for (let output of this.#outputs) {
			let outputSize = output.toCBOR().length + 160;

			assert(BigInt(outputSize)*BigInt(lovelacePerByte) <= output.value.lovelace, "not enough lovelace in output");
		}
	}
	
	/**
	 * @param {?bigint} minCollateral 
	 */
	checkCollateral(minCollateral) {
		if (minCollateral === null) {
			assert(this.#collateral.length == 0, "unnecessary collateral included");
		} else {
			let sum = new MoneyValue();

			for (let col of this.#collateral) {
				if (col.origOutput === null) {
					throw new Error("expected collateral TxInput.origOutput to be set");
				} else {
					sum = sum.add(col.origOutput.value);
				}
			}

			assert(sum.lovelace >= minCollateral, "not enough collateral");

			if (sum.lovelace > minCollateral*5n){
				console.error("Warning: way too much collateral");
			}
		}
	}
}

class TxWitnesses extends CBORData {
	/** @type {PubKeyWitness[]} */
	#pubKeyWitnesses;

	/** @type {ListData} */
	#datums;

	/** @type {Redeemer[]} */
	#redeemers;

	/** @type {PlutusCoreProgram[]} */
	#scripts;

	constructor() {
		super();
		this.#pubKeyWitnesses = [];
		this.#datums = new ListData([]);
		this.#redeemers = [];
		this.#scripts = [];
	}

	/**
	 * @type {PlutusCoreProgram[]}
	 */
	get scripts() {
		return this.#scripts.slice();
	}

	toCBOR() {
		/**
		 * @type {Map<number, number[]>}
		 */
 		let object = new Map();

		if (this.#pubKeyWitnesses.length != 0) {
			object.set(0, CBORData.encodeDefList(this.#pubKeyWitnesses));
		}

		if (this.#datums.list.length != 0) {
			object.set(4, this.#datums.toCBOR());
		}

		if (this.#redeemers.length != 0) {
			object.set(5, CBORData.encodeDefList(this.#redeemers));
		}

		if (this.#scripts.length != 0) {
			/**
			 * @type {number[][]}
			 */
			let scriptBytes = this.#scripts.map(s => CBORData.encodeBytes(wrapCBORBytes(s.serializeBytes())));

			object.set(6, CBORData.encodeDefList(scriptBytes));
		}

		return CBORData.encodeObject(object);
	}

	/**
	 * 
	 * @param {number[]} bytes 
	 * @returns {TxWitnesses}
	 */
	static fromCBOR(bytes) {
		let txWitnesses = new TxWitnesses();

		CBORData.decodeObject(bytes, (i, fieldBytes) => {
			switch(i) {
				case 0:
					CBORData.decodeList(fieldBytes, itemBytes => {
						txWitnesses.#pubKeyWitnesses.push(PubKeyWitness.fromCBOR(itemBytes));
					});
					break;
				case 1:
				case 2:
				case 3:
					throw new Error("unhandled field");
				case 4:
					txWitnesses.#datums = ListData.fromCBOR(fieldBytes);
					break;
				case 5:
					CBORData.decodeList(fieldBytes, itemBytes => {
						txWitnesses.#redeemers.push(Redeemer.fromCBOR(itemBytes));
					});
					break;
				case 6:
					CBORData.decodeList(fieldBytes, itemBytes => {
						txWitnesses.#scripts.push(deserializePlutusCoreBytes(unwrapCBORBytes(CBORData.decodeBytes(itemBytes))));
					});
					break;
				default:
					throw new Error("unrecognized field");
			}
		});

		return txWitnesses;
	}

	/**
	 * Throws error if signatures are incorrect
	 * @param {number[]} bodyBytes 
	 */
	verifySignatures(bodyBytes) {
		for (let pubKeyWitness of this.#pubKeyWitnesses) {
			pubKeyWitness.verifySignature(bodyBytes);
		}
	}

	/**
	 * @returns {Object}
	 */
	dump() {
		return {
			"pubKeyWitnesses": this.#pubKeyWitnesses.map(pkw => pkw.dump()),
			"datums": this.#datums.list.map(datum => datum.toString()),
			"redeemers": this.#redeemers.map(redeemer => redeemer.dump()),
			"scripts": this.#scripts.map(script => bytesToHex(wrapCBORBytes(script.serializeBytes()))),
		};
	}

	/**
	 * @param {NetworkParams} networkParams
	 * @returns {bigint}
	 */
	estimateFee(networkParams) {
		let sum = 0n;

		for (let redeemer of this.#redeemers) {
			sum += redeemer.estimateFee(networkParams);
		}

		return sum;
	}

	/**
	 * @param {PubKeyWitness} pubKeyWitness 
	 */
	addSignature(pubKeyWitness) {
		this.#pubKeyWitnesses.push(pubKeyWitness);
	}

	/**
	 * @param {number} n
	 */
	addDummySignatures(n) {
		for (let i = 0 ; i < n; i++) {
			this.#pubKeyWitnesses.push(PubKeyWitness.dummy());
		}
	}

	removeDummySignatures() {
		this.#pubKeyWitnesses = this.#pubKeyWitnesses.filter(pkw => !pkw.isDummy());
	}

	/**
	 * @param {number} index 
	 * @param {PlutusCoreData} redeemerData 
	 */
	addSpendingRedeemer(index, redeemerData) {
		this.#redeemers.push(new SpendingRedeemer(index, redeemerData));
	}

	/**
	 * @param {number} index
	 * @param {PlutusCoreData} redeemerData
	 */
	addMintingRedeemer(index, redeemerData) {
		this.#redeemers.push(new MintingRedeemer(index, redeemerData));
	}

	/**
	 * @param {PlutusCoreData} data 
	 */
	addDatumData(data) {
		// check that it hasn't already been included
		for (let prev of this.#datums.list) {
			if (equals(prev.toCBOR(), data.toCBOR())) {
				return;
			}
		}

		let lst = this.#datums.list;
		lst.push(data);

		this.#datums = new ListData(lst);
	}

	/**
	 * @param {PlutusCoreProgram} program 
	 */
	addScript(program) {
		this.#scripts.push(program);
	}

	/**
	 * @param {Hash} validatorHash
	 * @returns {PlutusCoreProgram}
	 */
	getScript(validatorHash) {
		return assertDefined(this.#scripts.find(s => equals(s.hash(), validatorHash.bytes)));
	}

	/**
	 * @param {NetworkParams} networkParams 
	 * @returns {?Hash} - returns null if there are no redeemers
	 */
	calcScriptDataHash(networkParams) {
		if (this.#redeemers.length > 0) {
			let bytes = CBORData.encodeDefList(this.#redeemers);

			if (this.#datums.list.length > 0) {
				bytes = bytes.concat(this.#datums.toCBOR());
			}

			// language view encodings?
			let sortedCostParams = networkParams.sortedCostParams;

			bytes = bytes.concat(CBORData.encodeMap([[
				CBORData.encodeInteger(1n), 
				CBORData.encodeDefList(sortedCostParams.map(cp => CBORData.encodeInteger(BigInt(cp)))),
			]]));

			return new Hash(Crypto.blake2b(bytes));
		} else {
			return null;
		}
	}

	/**
	 * Executes the redeemers in order to calculate the necessary ex units
	 * @param {NetworkParams} networkParams 
	 * @param {TxBody} body - needed in order to create correct ScriptContexts
	 * @returns {Promise<void>}
	 */
	async executeRedeemers(networkParams, body) {
		for (let i = 0; i < this.#redeemers.length; i++) {
			let redeemer = this.#redeemers[i];

			let scriptContext = body.toScriptContextData(networkParams, this.#redeemers, this.#datums, i);

			if (redeemer instanceof SpendingRedeemer) {
				let idx = redeemer.inputIndex;

				let origOutput = body.inputs[idx].origOutput;

				if (origOutput === null) {
					throw new Error("expected origOutput to be non-null");
				} else {
					let datumData = origOutput.getDatumData();

					let validatorHash = origOutput.address.validatorHash;

					if (validatorHash === null || validatorHash === undefined) {
						throw new Error("expected validatorHash to be non-null");
					} else {
						let script = this.getScript(validatorHash);

						let profile = await script.profile([
							new PlutusCoreDataValue(Site.dummy(), datumData), 
							new PlutusCoreDataValue(Site.dummy(), redeemer.data), 
							new PlutusCoreDataValue(Site.dummy(), scriptContext),
						], networkParams);

						redeemer.setCost({mem: profile.mem, cpu: profile.cpu});
					}
				}
			} else if (redeemer instanceof MintingRedeemer) {
				let mph = body.minted.getMintingPolicyHash(redeemer.mphIndex);

				let script = this.getScript(mph);

				let profile = await script.profile([
					new PlutusCoreDataValue(Site.dummy(), redeemer.data),
					new PlutusCoreDataValue(Site.dummy(), scriptContext),
				], networkParams);

				redeemer.setCost({mem: profile.mem, cpu: profile.cpu});
			} else {
				throw new Error("unhandled redeemer type");
			}
		}
	}

	/**
	 * Throws error if execution budget is exceeded
	 * @param {NetworkParams} networkParams
	 */
	checkExecutionBudget(networkParams) {
		let totalMem = 0n;
		let totalCpu = 0n;

		for (let redeemer of this.#redeemers) {
			totalMem += redeemer.memCost;
			totalCpu += redeemer.cpuCost;
		}

		let [maxMem, maxCpu] = networkParams.txExecutionBudget;

		if (totalMem >= BigInt(maxMem)) {
			throw new Error("execution budget exceeded for mem");
		}

		if (totalCpu >= BigInt(maxCpu)) {
			throw new Error("execution budget exceeded for cpu");
		}
	}
}

export class TxInput extends CBORData {
	/** @type {Hash} */
	#txId;

	/** @type {bigint} */
	#utxoIdx;

	/** @type {?TxOutput} */
	#origOutput;

	/**
	 * @param {Hash} txId 
	 * @param {bigint} utxoIdx 
	 * @param {?TxOutput} origOutput - used during building, not part of serialization
	 */
	constructor(txId, utxoIdx, origOutput = null) {
		super();
		this.#txId = txId;
		this.#utxoIdx = utxoIdx;
		this.#origOutput = origOutput;
	}
	
	get txId() {
		return this.#txId;
	}

	get utxoIdx() {
		return this.#utxoIdx;
	}

	get origOutput() {
		return this.#origOutput;
	}

	/**
	 * @returns {ConstrData}
	 */
	toOutputIdData() {
		return new ConstrData(0, [
			new ConstrData(0, [new ByteArrayData(this.#txId.bytes)]),
			new IntData(this.#utxoIdx),
		]);
	}

	/**
	 * @returns {ConstrData}
	 */
	toData() {
		if (this.#origOutput === null) {
			throw new Error("expected to be non-null");
		} else {
			return new ConstrData(0, [
				this.toOutputIdData(),
				this.#origOutput.toData(),
			]);
		}
	}

	/**
	 * @returns {number[]}
	 */
	toCBOR() {
		return CBORData.encodeTuple([
			this.#txId.toCBOR(),
			CBORData.encodeInteger(this.#utxoIdx),
		]);
	}

	/**
	 * @param {number[]} bytes 
	 * @returns {TxInput}
	 */
	static fromCBOR(bytes) {
		/** @type {?Hash} */
		let txId = null;

		/** @type {?bigint} */
		let utxoIdx = null;

		CBORData.decodeTuple(bytes, (i, fieldBytes) => {
			switch(i) {
				case 0:
					txId = Hash.fromCBOR(fieldBytes);
					break;
				case 1:
					utxoIdx = CBORData.decodeInteger(fieldBytes);
					break;
				default:
					throw new Error("unrecognized field");
			}
		});

		if (txId === null || utxoIdx === null) {
			throw new Error("unexpected");
		} else {
			return new TxInput(txId, utxoIdx);
		}
	}

	/**
	 * @returns {Object}
	 */
	dump() {
		return {
			"txId": this.#txId.dump(),
			"utxoIdx": this.#utxoIdx.toString(),
			"origOutput": this.#origOutput !== null ? this.#origOutput.dump() : null,
		};
	}
}

/**
 * UTxO is an alias for TxInput
 */
export class UTxO extends TxInput {
	/**
	 * @param {Hash} txId 
	 * @param {bigint} utxoIdx 
	 * @param {TxOutput} origOutput
	 */
	constructor(txId, utxoIdx, origOutput) {
		super(txId, utxoIdx, origOutput);
	}

	/**
	 * Deserializes UTxO format used by wallet connector
	 * @param {number[]} bytes
	 * @returns {TxInput}
	 */
	static fromCBOR(bytes) {
		/** @type {?TxInput} */
		let txInput = null;

		/** @type {?TxOutput} */
		let origOutput = null;

		CBORData.decodeTuple(bytes, (i, fieldBytes) => {
			switch(i) {
				case 0:
					txInput = TxInput.fromCBOR(fieldBytes);
					break;
				case 1:
					origOutput = TxOutput.fromCBOR(fieldBytes);
					break;
				default:
					throw new Error("unrecognized field");
			}
		});

		if (txInput == null || origOutput == null) {
			throw new Error("unexpected");
		} else {
			return new TxInput(txInput.txId, txInput.utxoIdx, origOutput);
		}
	}
}

export class TxOutput extends CBORData {
	/** @type {Address} */
	#address;

	/** @type {MoneyValue} */
	#value;

	/** @type {?OutputDatum} */
	#datum;

	/** @type {?number[]} */
	#refScript;

	/**
	 * @param {Address} address 
	 * @param {MoneyValue} value 
	 * @param {?OutputDatum} datum 
	 * @param {?number[]} refScript 
	 */
	constructor(address, value, datum = null, refScript = null) {
		super();
		this.#address = address;
		this.#value = value;
		this.#datum = datum;
		this.#refScript = refScript;
	}

	get address() {
		return this.#address;
	}

	get value() {
		return this.#value;
	}

	get datum() {
		return this.#datum;
	}

	/**
	 * @returns {PlutusCoreData}
	 */
	getDatumData() {
		if (this.#datum === null) {
			throw new Error("no datum data available");
		} else {
			return this.#datum.getDatumData();
		}
	}

	toCBOR() {
		/** @type {Map<number, number[]>} */
		let object = new Map();

		object.set(0, this.#address.toCBOR());
		object.set(1, this.#value.toCBOR());

		if (this.#datum !== null) {
			object.set(2, this.#datum.toCBOR());
		}

		if (this.#refScript !== null) {
			object.set(3, CBORData.encodeBytes(this.#refScript, false));
		}

		return CBORData.encodeObject(object);
	}

	/**
	 * @param {number[]} bytes 
	 * @returns {TxOutput}
	 */
	static fromCBOR(bytes) {
		/** @type {?Address} */
		let address = null;

		/** @type {?MoneyValue} */
		let value = null;

		/** @type {?OutputDatum} */
		let outputDatum = null;

		/** @type {?number[]} */
		let refScript = null;

		if (CBORData.isObject(bytes)) {
			CBORData.decodeObject(bytes, (i, fieldBytes) => {
				switch(i) { 
					case 0:
						address = Address.fromCBOR(fieldBytes);
						break;
					case 1:
						value = MoneyValue.fromCBOR(fieldBytes);
						break;
					case 2:
						outputDatum = OutputDatum.fromCBOR(fieldBytes);
						break;
					case 3:
						refScript = CBORData.decodeBytes(fieldBytes);
						break;
					default:
						throw new Error("unreconginzed field");
				}
			});
		} else if (CBORData.isTuple(bytes)) {
			// this is the pre-alonzo format, which is still sometimes returned by wallet connector functions
			CBORData.decodeTuple(bytes, (i, fieldBytes) => {
				switch(i) { 
					case 0:
						address = Address.fromCBOR(fieldBytes);
						break;
					case 1:
						value = MoneyValue.fromCBOR(fieldBytes);
						break;
					default:
						throw new Error("unrecognized field");
				}
			});
		} else {
			throw new Error("expected object or tuple for TxOutput");
		}

		if (address === null || value === null) {
			throw new Error("unexpected");
		} else {
			return new TxOutput(address, value, outputDatum, refScript);
		}
	}

	/**
	 * @returns {Object}
	 */
	dump() {
		return {
			"address": this.#address.dump(),
			"value": this.#value.dump(),
			"datum": this.#datum === null ? "none" : this.#datum.dump(),
			"ref_script": this.#refScript === null ? "none" : bytesToHex(this.#refScript),
		};
	}

	/**
	 * @returns {ConstrData}
	 */
	toData() {
		let datum = new ConstrData(0, []); // none
		if (this.#datum !== null) {
			datum = this.#datum.getDatumData();
		}

		return new ConstrData(0, [
			this.#address.toData(),
			this.#value.toData(),
			datum,
		]);
	}
}

// TODO
class DCert extends CBORData {
	constructor() {
		super();
	}

	/**
	 * @param {number[]} bytes 
	 * @returns {DCert}
	 */
	static fromCBOR(bytes) {
		throw new Error("not yet implemented");
	}

	/**
	 * @returns {ConstrData}
	 */
	toData() {
		throw new Error("not yet implemented");
	}
}

/**
 * See CIP19 for formatting of first byte
 */
export class Address extends CBORData {
	/** @type {number[]} */
	#bytes;

	/**
	 * @param {number[]} bytes 
	 */
	constructor(bytes) {
		super();
		this.#bytes = bytes;
	}

	toCBOR() {
		return CBORData.encodeBytes(this.#bytes, false);
	}

	/**
	 * @param {number[]} bytes 
	 * @returns {Address}
	 */
	static fromCBOR(bytes) {
		return new Address(CBORData.decodeBytes(bytes));
	}

	/**
	 * @param {string} str 
	 * @returns {Address}
	 */
	static fromBech32(str) {
		// ignore the prefix (encoded in the bytes anyway)
		let [_, bytes] = Crypto.decodeBech32(str);

		return new Address(bytes);
	}

	/**
	 * @returns {string}
	 */
	toBech32() {
		return Crypto.encodeBech32(this.isForTestnet() ? "addr_test" : "addr", this.#bytes);
	}

	/**
	 * @returns {string}
	 */
	dump() {
		return bytesToHex(this.#bytes);
	}

	/**
	 * @returns {boolean}
	 */
	isForTestnet() {
		let type = this.#bytes[0] & 0b00001111;

		return type == 0;
	}
		
	/**
	 * @returns {ConstrData}
	 */
	toCredentialData() {
		let vh = this.validatorHash;

		if (vh !== null) {
			return new ConstrData(1, [
				new ByteArrayData(vh.bytes)
			]);
		} else {
			let pkh = this.pubKeyHash;

			if (pkh === null) {
				throw new Error("unexpected");
			} else {
				return new ConstrData(0, [
					new ByteArrayData(pkh.bytes)
				]);
			}
		}
	}

	/**
	 * @returns {ConstrData}
	 */
	toStakingData() {
		let sh = this.stakingHash;

		if (sh == null) {
			return new ConstrData(1, []); // none
		} else {
			// some
			return new ConstrData(0, [
				// staking credential
				new ConstrData(0, [
					// credential (TODO: also allow script and pointer)
					new ConstrData(0, [
						new ByteArrayData(sh.bytes),
					]),
				])
			]); // some
		}
	}

	/**
	 * @returns {ConstrData}
	 */
	toData() {
		return new ConstrData(0, [
			this.toCredentialData(),
			this.toStakingData(),
		]);
	}

	/**
	 * @type {?Hash}
	 */
	get pubKeyHash() {
		let type = this.#bytes[0] >> 4;

		if (type % 2 == 0) {
			return new Hash(this.#bytes.slice(1, 29));
		} else {
			return null;
		}
	}

	/**
	 * @type {?Hash}
	 */
	get validatorHash() {
		let type = this.#bytes[0] >> 4;

		if (type % 2 == 1) {
			return new Hash(this.#bytes.slice(1, 29));
		} else {
			return null;
		}
	}

	/**
	 * @type {?Hash}
	 */
	get stakingHash() {
		let type = (this.#bytes[0] >> 4);

		if (type < 4) {
			let bytes = this.#bytes.slice(29);
			assert(bytes.length == 28);
			return new Hash(bytes);
		} else {
			return null;
		}
	}
}

export class MultiAsset extends CBORData {
	/** @type {[Hash, [number[], bigint][]][]} */
	#assets;

	/**
	 * @param {[Hash, [number[], bigint][]][]} assets 
	 */
	constructor(assets = []) {
		super();
		this.#assets = assets;
	}

	/**
	 * @type {Hash[]}
	 */
	get keys() {
		return this.#assets.map(pair => pair[0]);
	}

	/**
	 * @returns {boolean}
	 */
	isZero() {
		return this.#assets.length == 0;
	}

	/**
	 * @param {Hash} assetClass 
	 * @param {number[]} tokenName 
	 * @returns {boolean}
	 */
	has(assetClass, tokenName) {
		let inner = this.#assets.find(asset => assetClass.equals(asset[0]));

		if (inner !== undefined) {
			return inner[1].findIndex(pair => equals(pair[0], tokenName)) != -1;
		} else {
			return false;
		}
	}

	/**
	 * @param {Hash} assetClass 
	 * @param {number[]} tokenName 
	 * @returns {bigint}
	 */
	get(assetClass, tokenName) {
		let inner = this.#assets.find(asset => assetClass.equals(asset[0]));

		if (inner !== undefined) {
			let token = inner[1].find(pair => equals(pair[0], tokenName));

			if (token !== undefined) {
				return token[1];
			} else {
				return 0n;
			}
		} else {
			return 0n;
		}
	}

	/**
	 * Mutates
	 */
	removeZeroes() {
		for (let asset of this.#assets) {
			asset[1] = asset[1].filter(token => token[1] != 0n);
		}

		this.#assets = this.#assets.filter(asset => asset[1].length != 0);
 	}

	/**
	 * Mutates
	 * @param {Hash} assetClass 
	 * @param {number[]} tokenName 
	 * @param {bigint} amount
	 */
	addComponent(assetClass, tokenName, amount) {
		if (amount == 0n) {
			return;
		}

		let inner = this.#assets.find(asset => assetClass.equals(asset[0]));

		if (inner === undefined) {
			this.#assets.push([assetClass, [[tokenName, amount]]]);
		} else {
			let token = inner[1].find(pair => equals(pair[0], tokenName));

			if (token === undefined) {
				inner[1].push([tokenName, amount]);
			} else {
				token[1] += amount;
			}
		}

		this.removeZeroes();
	}

	/**
	 * @param {MultiAsset} other 
	 * @param {(a: bigint, b: bigint) => bigint} op 
	 * @returns {MultiAsset}
	 */
	addSub(other, op) {
		let res = new MultiAsset();

		for (let asset of this.#assets) {
			for (let token of asset[1]) {
				res.addComponent(asset[0], token[0], op(token[1], 0n));
			}
		}

		for (let asset of other.#assets) {
			for (let token of asset[1]) {
				res.addComponent(asset[0], token[0], op(0n, token[1]));
			}
		}

		return res;
	}

	/**
	 * @param {MultiAsset} other 
	 * @returns {MultiAsset}
	 */
	add(other) {
		return this.addSub(other, (a, b) => a + b);
	}

	/**
	 * @param {MultiAsset} other 
	 * @returns {MultiAsset}
	 */
	sub(other) {
		return this.addSub(other, (a, b) => a - b);
	}

	/**
	 * Mutates. Throws error if mph is already contained in this
	 * @param {Hash} mph
	 * @param {[number[], bigint][]} lst
	 * @returns {number} - index of added entry
	 */
	addMintingPolicy(mph, lst) {
		for (let asset of this.#assets) {
			if (asset[0].equals(mph)) {
				throw new Error(`MultiAsset already contains ${bytesToHex(mph.bytes)}`);
			}
		}

		let idx = this.#assets.length;

		this.#assets.push([mph, lst.slice()]);

		return idx;
	}
	
	/**
	 * @param {number} idx 
	 * @returns {Hash}
	 */
	getMintingPolicyHash(idx) {
		return this.#assets[idx][0];
	}

	/**
	 * @param {Hash} mph
	 * @returns {number[][]}
	 */
	getTokens(mph) {
		for (let asset of this.#assets) {
			if (asset[0].equals(mph)) {
				return asset[1].map(pair => pair[0]);
			}
		}

		return [];
	}

	/**
	 * @param {MultiAsset} other 
	 * @returns {boolean}
	 */
	equals(other) {
		for (let asset of this.#assets) {
			for (let token of asset[1]) {
				if (token[1] != other.get(asset[0], token[0])) {
					return false;
				}
			}
		}

		for (let asset of other.#assets) {
			for (let token of asset[1]) {
				if (token[1] != this.get(asset[0], token[0])) {
					return false;
				}
			}
		}

		return true;
	}

	/**
	 * Strict gt, if other contains assets this one doesn't contain => return false
	 * @param {MultiAsset} other 
	 * @returns {boolean}
	 */
	greaterThan(other) {
		if (this.isZero()) {
			return false;
		}

		for (let asset of this.#assets) {
			for (let token of asset[1]) {
				if (token[1] <= other.get(asset[0], token[0])) {
					return false;
				}
			}
		}

		for (let asset of other.#assets) {
			for (let token of asset[1]) {
				if (!this.has(asset[0], token[0])) {
					return false;
				}
			}
		}

		return true;
	}

	/**
	 * @returns {boolean}
	 */
	allPositive() {
		for (let asset of this.#assets) {
			for (let pair of asset[1]) {
				if (pair[1] < 0n) {
					return false;
				} else if (pair[1] == 0n) {
					throw new Error("unexpected");
				}
			}
		}

		return true;
	}

	/**
	 * @param {MultiAsset} other 
	 * @returns {boolean}
	 */
	greaterOrEqualsThan(other) {
		return this.greaterThan(other) || this.equals(other);
	}

	/**
	 * Throws an error if any contained quantity <= 0n
	 */
	assertAllPositive() {
		assert(this.allPositive());
	}

	toCBOR() {
		return CBORData.encodeMap(
			this.#assets.map(
				outerPair => {
					return [outerPair[0].toCBOR(), CBORData.encodeMap(outerPair[1].map(
						innerPair => {
							return [
								CBORData.encodeBytes(innerPair[0], false), CBORData.encodeInteger(innerPair[1])
							]
						}
					))]
				}
			)
		)
	}

	/**
	 * @param {number[]} bytes
	 * @returns {MultiAsset}
	 */
	static fromCBOR(bytes) {
		let ms = new MultiAsset();

		CBORData.decodeMap(bytes, pairBytes => {
			let mph = Hash.fromCBOR(pairBytes);

			/**
			 * @type {[number[], bigint][]}
			 */
			let innerMap = [];
			
			CBORData.decodeMap(pairBytes, innerPairBytes => {
				innerMap.push([
					CBORData.decodeBytes(innerPairBytes),
					CBORData.decodeInteger(innerPairBytes),
				]);
			});

			ms.#assets.push([mph, innerMap]);
		});

		return ms;
	}

	/**
	 * @returns {Object}
	 */
	dump() {
		let obj = {};

		for (let pairs of this.#assets) {
			let innerObj = {};

			for (let innerPair of pairs[1]) {
				innerObj[bytesToHex(innerPair[0])] = innerPair[1].toString();
			}

			obj[pairs[0].dump()] = innerObj;
		}

		return obj;
	}

	/**
	 * @returns {MapData}
	 */
	toData() {
		/** @type {[PlutusCoreData, PlutusCoreData][]} */
		let pairs = [];

		for (let asset of this.#assets) {
			/** @type {[PlutusCoreData, PlutusCoreData][]} */
			let innerPairs = [];

			for (let token of asset[1]) {
				innerPairs.push([
					new ByteArrayData(token[0]),
					new IntData(token[1]),
				]);
			}

			pairs.push([
				new ByteArrayData(asset[0].bytes),
				new MapData(innerPairs),
			])
		}

		return new MapData(pairs);
	}
}

export class MoneyValue extends CBORData {
	/** @type {bigint} */
	#lovelace;

	/** @type {MultiAsset} */
	#multiAsset;
	
	/**
	 * @param {bigint} lovelace 
	 * @param {MultiAsset} multiAsset 
	 */
	constructor(lovelace = 0n, multiAsset = new MultiAsset()) {
		super();
		this.#lovelace = lovelace;
		this.#multiAsset = multiAsset;
	}

	get lovelace() {
		return this.#lovelace;
	}

	set lovelace(lovelace) {
		this.#lovelace = lovelace;
	}

	get multiAsset() {
		return this.#multiAsset;
	}

	toCBOR() {
		if (this.#multiAsset.isZero()) {
			return CBORData.encodeInteger(this.#lovelace);
		} else {
			return CBORData.encodeTuple([
				CBORData.encodeInteger(this.#lovelace),
				this.#multiAsset.toCBOR()
			]);
		}
	}

	/**
	 * @param {number[]} bytes 
	 * @returns {MoneyValue}
	 */
	static fromCBOR(bytes) {
		let mv = new MoneyValue();

		if (CBORData.isTuple(bytes)) {
			CBORData.decodeTuple(bytes, (i, fieldBytes) => {
				switch(i) {
					case 0:
						mv.#lovelace = CBORData.decodeInteger(fieldBytes);
						break;
					case 1:
						mv.#multiAsset = MultiAsset.fromCBOR(fieldBytes);
						break;
					default:
						throw new Error("unrecognized field");
				}
			});
		} else {
			mv.#lovelace = CBORData.decodeInteger(bytes);
		}

		return mv;
	}

	/**
	 * @param {MoneyValue} other 
	 * @returns {MoneyValue}
	 */
	add(other) {
		return new MoneyValue(this.#lovelace + other.#lovelace, this.#multiAsset.add(other.#multiAsset));
	}

	/**
	 * @param {MoneyValue} other 
	 * @returns {MoneyValue}
	 */
	sub(other) {
		return new MoneyValue(this.#lovelace - other.#lovelace, this.#multiAsset.sub(other.#multiAsset));
	}

	/**
	 * @param {MoneyValue} other 
	 * @returns {boolean}
	 */
	equals(other) {
		return (this.#lovelace == other.#lovelace) && (this.#multiAsset.equals(other.#multiAsset));
	}

	/**
	 * Strictly greater than. Returns false if any asset is missing 
	 * @param {MoneyValue} other 
	 * @returns {boolean}
	 */
	greaterThan(other) {
		return (this.#lovelace > other.#lovelace) && (this.#multiAsset.greaterThan(other.#multiAsset));
	}

	/**
	 * Strictly >= 
	 * @param {MoneyValue} other 
	 * @returns {boolean}
	 */
	greaterOrEqualsThan(other) {
		return (this.#lovelace >= other.#lovelace) && (this.#multiAsset.greaterOrEqualsThan(other.#multiAsset));
	}

	/**
	 * @returns {MoneyValue} - returns this
	 */
	assertAllPositive() {
		assert(this.#lovelace >= 0n);

		this.#multiAsset.assertAllPositive();

		return this;
	}

	/**
	 * @returns {Object}
	 */
	dump() {
		return {
			"lovelace": this.#lovelace.toString(),
			"multiAsset": this.#multiAsset.dump()
		};
	}

	/**
	 * @returns {MapData}
	 */
	toData() {
		let map = this.#multiAsset.toData();

		if (this.#lovelace != 0n) {
			let inner = map.map;

			inner.unshift([
				new ByteArrayData([]),
				new MapData([
					[new ByteArrayData([]), new IntData(this.#lovelace)]
				]),
			]);
		}

		return map;
	}
}

export class Hash extends CBORData {
	/** @type {number[]} */
	#bytes;

	/**
	 * @param {number[]} bytes 
	 */
	constructor(bytes) {
		super();
		this.#bytes = bytes;
	}

	/**
	 * @returns {number[]}
	 */
	get bytes() {
		return this.#bytes;
	}

	/**
	 * @returns {string}
	 */
	get hex() {
		return bytesToHex(this.#bytes);
	}

	/**
	 * @returns {number[]}
	 */
	toCBOR() {
		return CBORData.encodeBytes(this.#bytes, false);
	}

	/**
	 * @param {number[]} bytes 
	 * @returns {Hash}
	 */
	static fromCBOR(bytes) {
		return new Hash(CBORData.decodeBytes(bytes));
	}

	/**
	 * @param {string} str 
	 * @returns {Hash}
	 */
	static fromHex(str) {
		return new Hash(hexToBytes(str));
	}

	static dummy(n = 32) {
		return new Hash((new Array(n)).fill(0));
	}
	/**
	 * @returns {string}
	 */
	dump() {
		return bytesToHex(this.#bytes);
	}

	/**
	 * @param {Hash} other
	 */
	equals(other) {
		return equals(this.#bytes, other.#bytes);
	}
}

class PubKeyWitness extends CBORData {
	/** @type {number[]} */
	#pubKey;

	/** @type {number[]} */
	#signature;

	/**
	 * @param {number[]} pubKey 
	 * @param {number[]} signature 
	 */
	constructor(pubKey, signature) {
		super();
		this.#pubKey = pubKey;
		this.#signature = signature;
	}

	/**
	 * @returns {PubKeyWitness}
	 */
	static dummy() {
		return new PubKeyWitness((new Array(32)).fill(0), (new Array(64)).fill(0));
	}

	/**
	 * @returns {boolean}
	 */
	isDummy() {
		return this.#pubKey.every(b => b == 0) && this.#signature.every(b => b == 0);
	}

	toCBOR() {
		return CBORData.encodeTuple([
			CBORData.encodeBytes(this.#pubKey, false),
			CBORData.encodeBytes(this.#signature, false),
		]);
	}

	/**
	 * @param {number[]} bytes 
	 * @returns {PubKeyWitness}
	 */
	static fromCBOR(bytes) {
		/** @type {?number[]} */
		let pubKey = null;

		/** @type {?number[]} */
		let signature = null;

		let n = CBORData.decodeTuple(bytes, (i, fieldBytes) => {
			switch(i) {
				case 0:
					pubKey = CBORData.decodeBytes(fieldBytes);
					break;
				case 1:
					signature = CBORData.decodeBytes(fieldBytes);
					break;
				default:
					throw new Error("unrecognized field");
			}
		});

		assert(n == 2);

		if (pubKey === null || signature === null) {
			throw new Error("unexpected");
		} else {
			return new PubKeyWitness(pubKey, signature);
		}
	}

	/**
	 * @returns {Object}
	 */
	dump() {
		return {
			"pubKey": bytesToHex(this.#pubKey),
			"pubKeyHash": bytesToHex(Crypto.blake2b(this.#pubKey, 28)),
			"signature": bytesToHex(this.#signature),
		};
	}

	/**
	 * Throws error if incorrect
	 * @param {number[]} msg
	 */
	verifySignature(msg) {
		if (this.#signature === null) {
			throw new Error("signature can't be null");
		} else {
			if (this.#pubKey === null) {
				throw new Error("pubKey can't be null");
			} else {
				if (!Crypto.Ed25519.verify(this.#signature, msg, this.#pubKey)) {
					throw new Error("incorrect signature");
				}
			}
		}
	}
}

class Redeemer extends CBORData {
	/** @type {PlutusCoreData} */
	#data;

	/** @type {Cost} */
	#exUnits;

	/**
	 * @param {PlutusCoreData} data 
	 * @param {Cost} exUnits 
	 */
	constructor(data, exUnits = {mem: 0n, cpu: 0n}) {
		super();
		this.#data = data;
		this.#exUnits = exUnits;
	}

	/**
	 * @type {PlutusCoreData}
	 */
	get data() {
		return this.#data;
	}

	/**
	 * @type {bigint}
	 */
	get memCost() {
		return this.#exUnits.mem;
	}

	/**
	 * @type {bigint}
	 */
	get cpuCost() {
		return this.#exUnits.cpu;
	}

	/**
	 * type:
	 *   0 -> spending
	 *   1 -> minting 
	 *   2 -> certifying
	 *   3 -> rewarding
	 * @param {number} type 
	 * @param {number} index 
	 * @returns {number[]}
	 */
	toCBORInternal(type, index) {
		return CBORData.encodeTuple([
			CBORData.encodeInteger(BigInt(type)),
			CBORData.encodeInteger(BigInt(index)),
			this.#data.toCBOR(),
			CBORData.encodeTuple([
				CBORData.encodeInteger(this.#exUnits.mem),
				CBORData.encodeInteger(this.#exUnits.cpu),
			]),
		]);
	}

	/**
	 * @param {number[]} bytes 
	 * @returns {Redeemer}
	 */
	static fromCBOR(bytes) {
		/** @type {?number} */
		let type = null;

		/** @type {?number} */
		let index = null;

		/** @type {?PlutusCoreData} */
		let data = null;

		/** @type {?Cost} */
		let cost = null;

		let n = CBORData.decodeTuple(bytes, (i, fieldBytes) => {
			switch(i) {
				case 0:
					type = Number(CBORData.decodeInteger(fieldBytes));
					break;
				case 1:
					index = Number(CBORData.decodeInteger(fieldBytes));
					break;
				case 2:
					data = PlutusCoreData.fromCBOR(fieldBytes);
					break;
				case 3: 
					/** @type {?bigint} */
					let mem = null;

					/** @type {?bigint} */
					let cpu = null;

					let m = CBORData.decodeTuple(fieldBytes, (j, subFieldBytes) => {
						switch (j) {
							case 0:
								mem = CBORData.decodeInteger(subFieldBytes);
								break;
							case 1:
								cpu = CBORData.decodeInteger(subFieldBytes);
								break;
							default:
								throw new Error("unrecognized field");
						}
					});

					assert(m == 2);

					if (mem === null || cpu === null) {
						throw new Error("unexpected");
					} else {
						cost = {mem: mem, cpu: cpu};
					}
					break;
				default:
					throw new Error("unrecognized field");
			}
		});

		assert(n == 4);

		if (type === null || index === null || data === null || cost === null) {
			throw new Error("unexpected");
		} else {

			switch(type) {
				case 0:
					return new SpendingRedeemer(index, data, cost);
				case 1:
					return new MintingRedeemer(index, data, cost);
				default:
					throw new Error("unhandled redeemer type (Todo)");	
			}
		}
	}

	/**
	 * @returns {Object}
	 */
	dumpInternal() {
		return {
			"data": this.#data.toString(),
			"exUnits": {
				"mem": Number(this.#exUnits.mem),
				"cpu": Number(this.#exUnits.cpu),
			},
		}
	}

	/**
	 * @returns {Object}
	 */
	dump() {
		throw new Error("not yet implemented");
	}

	/**
	 * @param {TxBody} body 
	 * @returns {ConstrData}
	 */
	toScriptPurposeData(body) {
		throw new Error("not yet implemented");
	}

	/**
	 * @param {Cost} cost 
	 */
	setCost(cost) {
		this.#exUnits = cost;
	}

	/**
	 * @param {NetworkParams} networkParams 
	 * @returns {bigint}
	 */
	estimateFee(networkParams) {
		assert(this.#exUnits.mem != 0n && this.#exUnits.cpu != 0n);

		let [memFee, cpuFee] = networkParams.exFeeParams;

		return BigInt(Math.ceil(Number(this.#exUnits.mem)*memFee + Number(this.#exUnits.cpu)*cpuFee));
	}
}

class SpendingRedeemer extends Redeemer {
	#inputIndex;

	/**
	 * @param {number} inputIndex 
	 * @param {PlutusCoreData} data 
	 * @param {Cost} exUnits 
	 */
	constructor(inputIndex, data, exUnits = {mem: 0n, cpu: 0n}) {
		super(data, exUnits);

		this.#inputIndex = inputIndex;
	}

	/**
	 * @type {number}
	 */
	get inputIndex() {
		return this.#inputIndex;
	}

	/**
	 * @returns {number[]}
	 */
	toCBOR() {
		return this.toCBORInternal(0, this.#inputIndex);
	}

	/**
	 * @returns {Object}
	 */
	dump() {
		let obj = super.dumpInternal();

		obj["type"] = 0;
		obj["typeName"] = "spending";
		obj["inputIndex"] = this.#inputIndex;

		return obj;
	}

	/**
	 * @param {TxBody} body 
	 * @returns {ConstrData}
	 */
	toScriptPurposeData(body) {
		return new ConstrData(1, [
			body.inputs[this.#inputIndex].toOutputIdData(),
		]);
	}
}

class MintingRedeemer extends Redeemer {
	#mphIndex;

	/**
	 * @param {number} mphIndex
	 * @param {PlutusCoreData} data
	 * @param {Cost} exUnits
	 */
	constructor(mphIndex, data, exUnits = {mem: 0n, cpu: 0n}) {
		super(data, exUnits);

		this.#mphIndex = mphIndex;
	}

	/**
	 * @type {number}
	 */
	get mphIndex() {
		return this.#mphIndex;
	}

	/**
	 * @returns {number[]}
	 */
	toCBOR() {
		return this.toCBORInternal(1, this.#mphIndex);
	}

	dump() {
		let obj = super.dumpInternal();

		obj["type"] = 1;
		obj["typeName"] = "minting";
		obj["mphIndex"] = this.#mphIndex;

		return obj;
	}

	/**
	 * 
	 * @param {TxBody} body 
	 * @returns {ConstrData}
	 */
	toScriptPurposeData(body) {
		let mph = body.minted.getMintingPolicyHash(this.#mphIndex);

		return new ConstrData(0, [
			new ByteArrayData(mph.bytes),
		]);
	}
}

class OutputDatum extends CBORData {
	constructor() {
		super();
	}

	/**
	 * @param {number[]} bytes 
	 * @returns {OutputDatum}
	 */
	static fromCBOR(bytes) {
		/** @type {?number} */
		let type = null;

		/** @type {?OutputDatum} */
		let res = null;

		let n = CBORData.decodeTuple(bytes, (i, fieldBytes) => {
			switch(i) {
				case 0:
					type = Number(CBORData.decodeInteger(fieldBytes));
					break;
				case 1:
					if (type == 0) {
						res = new OutputDatumHash(Hash.fromCBOR(fieldBytes));
					} else if (type == 1) {
						let tag = CBORData.decodeConstr(fieldBytes, subFieldBytes => {
							res = new OutputDatumInline(PlutusCoreData.fromCBOR(subFieldBytes));
						});
						assert(tag == 24);
					}
					break;
				default:
					throw new Error("unrecognized field label");
			}
		});

		assert(n == 2);

		if (type === null || res === null) {
			throw new Error("unexpected");
		} else {
			return res;
		}
	}

	dump() {
		throw new Error("not yet implemented");
	}

	/**
	 * @returns {ConstrData}
	 */
	getDatumData() {
		throw new Error("not yet implemented");
	}
}

class OutputDatumHash extends OutputDatum {
	/** @type {Hash} */
	#hash;

	/** @type {?PlutusCoreData} */
	#origData;

	/**
	 * @param {Hash} hash 
	 * @param {?PlutusCoreData} origData
	 */
	constructor(hash, origData = null) {
		super();
		this.#hash = hash;
		this.#origData = origData;

		if (this.#origData !== null) {
			assert(equals(this.#hash.bytes, Crypto.blake2b(this.#origData.toCBOR())));
		}
	}

	get data() {
		return this.#origData;
	}

	/**
	 * @returns {ConstrData}
	 */
	getDatumData() {
		return new ConstrData(1, [new ByteArrayData(this.#hash.bytes)]);
	}

	toCBOR() {
		return CBORData.encodeTuple([
			CBORData.encodeInteger(0n),
			this.#hash.toCBOR(),
		]);
	}

	/**
	 * @param {PlutusCoreData} data 
	 * @returns {OutputDatumHash}
	 */
	static fromData(data) {
		return new OutputDatumHash(new Hash(Crypto.blake2b(data.toCBOR())), data);
	}

	/**
	 * @returns {Object}
	 */
	dump() {
		return {
			"hash": this.#hash.dump(),
		};
	}
}

class OutputDatumInline extends OutputDatum {
	/** @type {PlutusCoreData} */
	#data;

	/**
	 * @param {PlutusCoreData} data
	 */
	constructor(data) {
		super();
		this.#data = data;
	}

	/**
	 * @returns {ConstrData}
	 */
	getDatumData() {
		return new ConstrData(2, [this.#data]);
	}

	/**
	 * @returns {number[]}
	 */
	toCBOR() {
		return CBORData.encodeTuple([
			CBORData.encodeInteger(1n),
			CBORData.encodeConstr(24, [this.#data.toCBOR()]),
		]);
	}

	/**
	 * @returns {Object}
	 */
	dump() {
		return {
			"inline": this.#data.toSchemaJSON(),
		};
	}
}


///////////////////////////////////////////////
// Section 19. Property based testing framework
///////////////////////////////////////////////

/**
 * @typedef {() => PlutusCoreValue} ValueGenerator
 */

/**
 * @typedef {(args: PlutusCoreValue[], res: (PlutusCoreValue | UserError)) => (boolean | Object.<string, boolean>)} PropertyTest
 */

/**
 * Creates generators and runs script tests
 */
export class FuzzyTest {
	/**
	 * @type {NumberGenerator} - seed generator
	 */
	#rand;

	#runsPerTest;

	#simplify;

	/**
	 * @param {number} seed
	 * @param {number} runsPerTest
	 * @param {boolean} simplify - if true then also test the simplified program
	 */
	constructor(seed = 0, runsPerTest = 100, simplify = false) {
		console.log("starting fuzzy testing  with seed", seed);

		this.#rand = Crypto.rand(seed);
		this.#runsPerTest = runsPerTest;
		this.#simplify = simplify;
	}

	/**
	 * @returns {NumberGenerator}
	 */
	newRand() {
		let seed = this.#rand()*1000000;

		return Crypto.rand(seed);
	}

	/**
	 * Returns a gernator for whole numbers between min and max
	 * @param {number} min
	 * @param {number} max
	 * @returns {() => bigint}
	 */
	rawInt(min = -10000000, max = 10000000) {
		let rand = this.newRand();

		return function() {
			return BigInt(Math.floor(rand()*(max - min)) + min);
		}
	}

	/**
	 * Returns a generator for whole numbers between min and max, wrapped with IntData
	 * @param {number} min
	 * @param {number} max
	 * @returns {ValueGenerator}
	 */
	int(min = -10000000, max = 10000000) {		
		let rand = this.rawInt(min, max);

		return function() {
			return new PlutusCoreDataValue(Site.dummy(), new IntData(rand()));
		}
	}

	/**
	 * Returns a generator for strings containing any utf-8 character
	 * @param {number} minLength
	 * @param {number} maxLength
	 * @returns {ValueGenerator}
	 */
	string(minLength = 0, maxLength = 64) {
		let rand = this.newRand();

		return function() {
			let n = Math.round(rand()*(maxLength - minLength)) + minLength;
			if (n < 0) {
				n = 0;
			}

			let chars = [];
			for (let i = 0; i < n; i++) {
				chars.push(String.fromCodePoint(Math.round(rand()*1112064)));
			}
			
			return new PlutusCoreDataValue(Site.dummy(), ByteArrayData.fromString(chars.join("")));
		}
	}

	/** 
	 * Returns a generator for strings with ascii characters from 32 (space) to 126 (tilde)
	 * @param {number} minLength
	 * @param {number} maxLength
	 * @returns {ValueGenerator}
	 */
	ascii(minLength = 0, maxLength = 64) {
		let rand = this.newRand();

		return function() {
			let n = Math.round(rand()*(maxLength - minLength)) + minLength;
			if (n < 0) {
				n = 0;
			}

			let chars = [];
			for (let i = 0; i < n; i++) {
				chars.push(String.fromCharCode(Math.round(rand()*94 + 32)));
			}
			
			return new PlutusCoreDataValue(Site.dummy(), ByteArrayData.fromString(chars.join("")));
		}
	}

	/**
	 * Returns a generator for bytearrays containing only valid ascii characters
	 * @param {number} minLength
	 * @param {number} maxLength
	 * @returns {ValueGenerator}
	 */
	asciiBytes(minLength = 0, maxLength = 64) {
		let rand = this.newRand();

		return function() {
			let n = Math.round(rand()*(maxLength - minLength)) + minLength;
			if (n < 0) {
				n = 0;
			}

			let bytes = [];
			for (let i = 0; i < n; i++) {
				bytes.push(Math.floor(rand()*94 + 32));
			}

			return new PlutusCoreDataValue(Site.dummy(), new ByteArrayData(bytes));
		}
	}

	/**
	 * Returns a generator for bytearrays the are also valid utf8 strings
	 * @param {number} minLength - length of the string, not of the bytearray!
	 * @param {number} maxLength - length of the string, not of the bytearray!
	 * @returns {ValueGenerator}
	 */
	utf8Bytes(minLength = 0, maxLength = 64) {
		return this.string(minLength, maxLength);
	}

	/**
	 * Returns a generator for number[]
	 * @param {number} minLength
	 * @param {number} maxLength
	 * @returns {() => number[]}
	 */
	rawBytes(minLength = 0, maxLength = 64) {
		let rand = this.newRand();

		return function() {
			let n = Math.round(rand()*(maxLength - minLength)) + minLength;
			if (n < 0) {
				n = 0;
			}

			let bytes = [];
			for (let i = 0; i < n; i++) {
				bytes.push(Math.floor(rand()*256));
			}

			return bytes;
		}
	}

	/**
	 * Returns a generator for bytearrays 
	 * @param {number} minLength
	 * @param {number} maxLength
	 * @returns {ValueGenerator}
	 */
	bytes(minLength = 0, maxLength = 64) {
		let rand = this.rawBytes(minLength, maxLength);

		return function() {
			let bytes = rand();

			return new PlutusCoreDataValue(Site.dummy(), new ByteArrayData(bytes));
		}
	}
	/**
	 * Returns a generator for booleans,
	 * @returns {() => boolean}
	 */
	rawBool() {
		let rand = this.newRand();

		return function() {
			let x = rand();

			return x >= 0.5;
		}
	}

	/**
	 * Returns a generator for booleans, wrapped with ConstrData
	 * @returns {ValueGenerator}
	 */
	bool() {
		let rand = this.rawBool();

		return function() {
			return new PlutusCoreBool(Site.dummy(), rand());
		}
	}

	/**
	 * Returns a generator for options
	 * @param {ValueGenerator} someGenerator
	 * @param {number} noneProbability
	 * @returns {ValueGenerator}
	 */
	option(someGenerator, noneProbability = 0.5) {
		let rand = this.newRand();

		return function() {
			let x = rand();

			if (x < noneProbability) {
				return new PlutusCoreDataValue(Site.dummy(), new ConstrData(1, []));
			} else {
				return new PlutusCoreDataValue(Site.dummy(), new ConstrData(0, [someGenerator().data]));
			}
		}
	}

	/**
	 * Returns a generator for lists
	 * @param {ValueGenerator} itemGenerator
	 * @param {number} minLength
	 * @param {number} maxLength
	 * @returns {ValueGenerator}
	 */
	list(itemGenerator, minLength = 0, maxLength = 10) {
		let rand = this.newRand();

		if (minLength < 0) {
			minLength = 0;
		}

		if (maxLength < 0) {
			maxLength = 0;
		}

		return function() {
			let n = Math.round(rand()*(maxLength - minLength)) + minLength;
			if (n < 0) {
				n = 0;
			}

			/**
			 * @type {PlutusCoreData[]}
			 */
			let items = [];

			for (let i = 0; i < n; i++) {
				items.push(itemGenerator().data);
			}

			return new PlutusCoreDataValue(Site.dummy(), new ListData(items));
		}
	}

	/**
	 * Returns a generator for maps
	 * @param {ValueGenerator} keyGenerator
	 * @param {ValueGenerator} valueGenerator
	 * @param {number} minLength
	 * @param {number} maxLength
	 * @returns {ValueGenerator}
	 */
	map(keyGenerator, valueGenerator, minLength = 0, maxLength = 10) {
		let rand = this.newRand();

		if (minLength < 0) {
			minLength = 0;
		}

		if (maxLength < 0) {
			maxLength = 0;
		}

		return function() {
			let n = Math.round(rand()*(maxLength - minLength)) + minLength;

			if (n < 0) {
				n = 0;
			}

			/**
			 * @type {[PlutusCoreData, PlutusCoreData][]}
			 */
			let pairs = [];

			for (let i = 0; i < n; i++) {
				pairs.push([keyGenerator().data, valueGenerator().data]);
			}

			return new PlutusCoreDataValue(Site.dummy(), new MapData(pairs));
		};
	}

	/**
	 * Returns a generator for objects
	 * @param {...ValueGenerator} itemGenerators
	 * @returns {ValueGenerator}
	 */
	object(...itemGenerators) {
		return function() {
			let items = itemGenerators.map(g => g().data);

			return new PlutusCoreDataValue(Site.dummy(), new ConstrData(0, items));
		}
	}

	/**
	 * Returns a generator for tagged constr
	 * @param {number} tag
	 * @param {...ValueGenerator} fieldGenerators
	 * @returns {ValueGenerator}
	 */
	constr(tag, ...fieldGenerators) {
		return function() {
			let fields = fieldGenerators.map(g => g().data);

			return new PlutusCoreDataValue(Site.dummy(), new ConstrData(tag, fields));
		}
	}

	/**
	 * Run a test
	 * @param {ValueGenerator[]} argGens
	 * @param {string} src
	 * @param {PropertyTest} propTest
	 * @param {number} nRuns
	 * @param {boolean} simplify
	 * @returns {Promise<void>} - throws an error if any of the property tests fail
	 */
	async test(argGens, src, propTest, nRuns = this.#runsPerTest, simplify = false) {
		// compilation errors here aren't caught

		let purposeName = extractScriptPurposeAndName(src);

		if (purposeName === null) {
			throw new Error("failed to get script purpose and name");
		} else {
			let [_, testName] = purposeName;

			let program = Program.new(src).compile(simplify);

			for (let it = 0; it < nRuns; it++) {
				let args = argGens.map(gen => gen());
			
				let result = await program.run(args);

				let obj = propTest(args, result);

				if (typeof obj == "boolean") {
					if (!obj) {
						throw new Error(`property test '${testName}' failed (info: (${args.map(a => a.toString()).join(', ')}) => ${result.toString()})`);
					}
				} else {
					// check for failures
					for (let key in obj) {
						if (!obj[key]) {
							throw new Error(`property test '${testName}:${key}' failed (info: (${args.map(a => a.toString()).join(', ')}) => ${result.toString()})`);
						}
					}
				}
			}

			console.log(`property tests for '${testName}' succeeded${simplify ? " (simplified)":""} (${program.calcSize()} bytes)`);
		}

		if (!simplify && this.#simplify) {
			await this.test(argGens, src, propTest, nRuns, true);
		}
	}

	/**
	 * @param {Object.<string, ValueGenerator>} paramGenerators
	 * @param {string[]} paramArgs
	 * @param {string} src
	 * @param {PropertyTest} propTest
	 * @param {number} nRuns
	 * @param {boolean} simplify
	 * @returns {Promise<void>}
	 */
	async testParams(paramGenerators, paramArgs, src, propTest, nRuns = this.#runsPerTest, simplify = false) {
		let program = Program.new(src);

		let purposeName = extractScriptPurposeAndName(src);

		if (purposeName === null) {
			throw new Error("failed to get script purpose and name");
		} else {
			let [_, testName] = purposeName;

			for (let it = 0; it < nRuns; it++) {

				for (let key in paramGenerators) {
					program.changeParam(key, paramGenerators[key]())
				}

				let args = paramArgs.map(paramArg => program.evalParam(paramArg));
			
				let coreProgram = Program.new(src).compile(simplify);

				let result = await coreProgram.run(args);

				let obj = propTest(args, result);

				if (typeof obj == "boolean") {
					if (!obj) {
						throw new Error(`property test '${testName}' failed (info: (${args.map(a => a.toString()).join(', ')}) => ${result.toString()})`);
					}
				} else {
					// check for failures
					for (let key in obj) {
						if (!obj[key]) {
							throw new Error(`property test '${testName}:${key}' failed (info: (${args.map(a => a.toString()).join(', ')}) => ${result.toString()})`);
						}
					}
				}
			}

			console.log(`property tests for '${testName}' succeeded${simplify ? " (simplified)":""}`);
		}

		if (!simplify && this.#simplify) {
			await this.testParams(paramGenerators, paramArgs, src, propTest, nRuns, true);
		}
	}
}

/**
 * The following functions are used in ./test-suite.js and ./test-script-addr.js and aren't (yet) 
 * intended to be used by regular users of this library.
 */
export const exportedForTesting = {
	setRawUsageNotifier: setRawUsageNotifier,
	debug: debug,
	setBlake2bDigestSize: setBlake2bDigestSize,
	hexToBytes: hexToBytes,
	bytesToHex: bytesToHex,
	stringToBytes: stringToBytes,
	bytesToString: bytesToString,
	wrapCBORBytes: wrapCBORBytes,
	unwrapCBORBytes: unwrapCBORBytes,
	Site: Site,
	Source: Source,
	Crypto: Crypto,
	MapData: MapData,
	PlutusCoreData: PlutusCoreData,
	CBORData: CBORData,
	ConstrData: ConstrData,
	IntData: IntData,
	ByteArrayData: ByteArrayData,
	ListData: ListData,
	PlutusCoreBool: PlutusCoreBool,
	PlutusCoreValue: PlutusCoreValue,
	PlutusCoreDataValue: PlutusCoreDataValue,
	ScriptPurpose: ScriptPurpose,
	PlutusCoreProgram: PlutusCoreProgram,
	PlutusCoreLambda: PlutusCoreLambda,
	PlutusCoreCall: PlutusCoreCall,
	PlutusCoreBuiltin: PlutusCoreBuiltin,
	PlutusCoreVariable: PlutusCoreVariable,
	PlutusCoreConst: PlutusCoreConst,
	PlutusCoreInt: PlutusCoreInt,
	IRProgram: IRProgram,
	Tx: Tx,
	TxBody: TxBody,
};
