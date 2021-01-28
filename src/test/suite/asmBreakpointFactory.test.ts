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

	test('Create breakpointFactory without valid paths', (done) => {
		assert.throws(() => {let _ = new AsmBreakpointFactory("", "");});
		done(); 
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

	test('Create a breakpoint on a codeline which isn\'t executed', (done) => {
		let codelineFromTestFile = 32;
		let expectedBreakpoint = <AsmBreakpoint>{ codeline: codelineFromTestFile, id: 1, verified: false};
		let createdBreakpoint = createBreakpoint(codelineFromTestFile);
		assert.strictEqual(createdBreakpoint.codeline, expectedBreakpoint.codeline);
		assert.strictEqual(createdBreakpoint.verified, expectedBreakpoint.verified);
		done();
	});

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

	test('Create a breakpoint not on a BRK Mnemonic', (done) => {
		let codelineWithBRKMnemonicFromTestFile = 69;
		let expectedBreakpoint = <AsmBreakpoint>{ codeline: codelineWithBRKMnemonicFromTestFile, id: 1, brk: false };
		let createdBreakpoint = createBreakpoint(codelineWithBRKMnemonicFromTestFile);
		assert.strictEqual(createdBreakpoint.codeline, expectedBreakpoint.codeline);
		assert.strictEqual(createdBreakpoint.brk, expectedBreakpoint.brk);
		done();
	});

	test('Check if breakpoint ids are each different', (done) => {
		let breakpointFactory = new AsmBreakpointFactory(pathToAsmFileForTest, pathToCorrespondingMapFileForTest);
		let createdBreakpointIDs = new Set<number>(); 
		for (let i = 0; i < 10000; i++) {
			let breakpoint = breakpointFactory.createBreakpoint(1);
			if(createdBreakpointIDs.has(breakpoint.id)) {
				assert.fail("Duplicate Breakpoint ID detected!");
			} else {
				createdBreakpointIDs.add(breakpoint.id);
			}
		}
		done(); 
	});

	test('Create a breakpoint on a not existing codeline', (done) => {
		let codelineNotExistingInAsmFile = 42000;
		assert.throws(() => {let _ = createBreakpoint(codelineNotExistingInAsmFile);});
		done();
	});

	test('Create breakpoints for each BRK Mnemonic', (done) => {
		let expectedBreakpoints: Array<AsmBreakpoint> = [{ codeline: 295, id: 1, verified: true, brk: true }, { codeline: 310, id: 2, verified: true, brk: true }];
		let breakpointFactory = new AsmBreakpointFactory(pathToAsmFileForTest, pathToCorrespondingMapFileForTest);
		let actualBreakpoints = breakpointFactory.createBreakpointForEachBrkMnemonic();
		assert.deepStrictEqual(actualBreakpoints, expectedBreakpoints);
		done();
	});

});
