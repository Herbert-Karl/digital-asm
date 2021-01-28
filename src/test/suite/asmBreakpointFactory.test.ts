import * as assert from 'assert';
import { after, before } from 'mocha';
import * as path from 'path';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { AsmBreakpoint } from '../../asmBreakpoint';
import { AsmBreakpointFactory } from '../../asmBreakpointFactory';

suite('AsmBreakpointFactory Test Suite', () => {

	const testFolderLocation = '/../../../src/test/examples/';
	let pathToAsmFileForTest = path.join(__dirname + testFolderLocation + 'test.asm');
	let pathToCorrespondingMapFileForTest = path.join(__dirname + testFolderLocation + 'test_mapping.map');

	before(() => {
		vscode.window.showInformationMessage('Start tests for AsmBreakpointFactory.');
	});
	after(() => {
		vscode.window.showInformationMessage('Finished tests for AsmBreakpointFactory!');
	});

	test('Create a simple breakpoint', (done) => {
		let codelineFromTestFile = 13;
		let expectedBreakpoint = <AsmBreakpoint>{ codeline: codelineFromTestFile, id: 1};
		let createdBreakpoint = createBreakpoint(codelineFromTestFile);
		assert.strictEqual(createdBreakpoint.codeline, expectedBreakpoint.codeline);
		assert.strictEqual(createdBreakpoint.id, expectedBreakpoint.id);
		done();
	});

	function createBreakpoint(codeline: number): AsmBreakpoint {
		let breakpointFactory = new AsmBreakpointFactory(pathToAsmFileForTest, pathToCorrespondingMapFileForTest);
		return breakpointFactory.createBreakpoint(codeline);
	}

	test('Create a breakpoint on a codeline which would be actually executed', (done) => {
		let codelineFromTestFile = 24;
		let expectedBreakpoint = <AsmBreakpoint>{ codeline: codelineFromTestFile, id: 1, verified: true};
		let createdBreakpoint = createBreakpoint(codelineFromTestFile);
		assert.strictEqual(createdBreakpoint.codeline, expectedBreakpoint.codeline);
		assert.strictEqual(createdBreakpoint.verified, expectedBreakpoint.verified);
		done();
	});

	test('Create a breakpoint on a BRK Mnemonic', (done) => {
		let codelineWithBRKMnemonicFromTestFile = 295;
		let expectedBreakpoint = <AsmBreakpoint>{ codeline: codelineWithBRKMnemonicFromTestFile, id: 1, brk: true };
		let createdBreakpoint = createBreakpoint(codelineWithBRKMnemonicFromTestFile);
		assert.strictEqual(createdBreakpoint.codeline, expectedBreakpoint.codeline);
		assert.strictEqual(createdBreakpoint.brk, expectedBreakpoint.brk);
		done();
	});

});
