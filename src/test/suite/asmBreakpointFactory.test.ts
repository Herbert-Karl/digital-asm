import * as assert from 'assert';
import * as net from 'net';
import { after, before } from 'mocha';
import * as path from 'path';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { AsmBreakpoint } from '../../asmBreakpoint';
import { AsmBreakpointFactory } from '../../asmBreakpointFactory';

suite('AsmBreakpointFactory Test Suite', () => {
	

	before(() => {
		vscode.window.showInformationMessage('Start tests for AsmBreakpointFactory.');
	});
	after(() => {
		vscode.window.showInformationMessage('Finished tests for AsmBreakpointFactory!');
	});

	test('Create a AsmBreakpoint', (done) => {
		let codelineForTest = 13;
		let expectedBreakpoint = <AsmBreakpoint> {codeline: codelineForTest, id: 1};
		let breakpointFactory = new AsmBreakpointFactory();
		let createdBreakpoint = breakpointFactory.createBreakpoint(codelineForTest);
		assert.deepStrictEqual(createdBreakpoint, expectedBreakpoint);
		done();
	});

});
