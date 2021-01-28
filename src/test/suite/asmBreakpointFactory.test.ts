import * as assert from 'assert';
import * as net from 'net';
import { after, before } from 'mocha';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';

suite('AsmBreakpointFactory Test Suite', () => {
	

	before(() => {
		vscode.window.showInformationMessage('Start tests for AsmBreakpointFactory.');
	});
	after(() => {
		vscode.window.showInformationMessage('Finished tests for AsmBreakpointFactory!');
	});

	test('Create a AsmBreakpoint', (done) => {
		done();
	});

});
