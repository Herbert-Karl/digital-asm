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
	let pathToCorrespondingMapFileForTest = path.join(__dirname + testFolderLocation + 'test_mapping.map');

	before(() => {
		vscode.window.showInformationMessage('Start tests for AsmBreakpointFactory.');
	});
	after(() => {
		vscode.window.showInformationMessage('Finished tests for AsmBreakpointFactory!');
	});

	test('Create a breakpoint on a codeline with no content', (done) => {
		let codelineForTest = 13;
		let expectedBreakpoint = <AsmBreakpoint>{ codeline: codelineForTest, id: 1, verified: false };
		let breakpointFactory = new AsmBreakpointFactory(pathToCorrespondingMapFileForTest);
		let createdBreakpoint = breakpointFactory.createBreakpoint(codelineForTest);
		assert.deepStrictEqual(createdBreakpoint, expectedBreakpoint);
		done();
	});

	test('Create a breakpoint on a codeline which would be actually executed', (done) => {
		let codelineForTest = 24;
		let expectedBreakpoint = <AsmBreakpoint>{ codeline: codelineForTest, id: 1, verified: true };
		let breakpointFactory = new AsmBreakpointFactory(pathToCorrespondingMapFileForTest);
		let createdBreakpoint = breakpointFactory.createBreakpoint(codelineForTest);
		assert.deepStrictEqual(createdBreakpoint, expectedBreakpoint);
		done();
	});

});
