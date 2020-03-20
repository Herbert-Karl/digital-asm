import * as assert from 'assert';
import * as fs from 'fs';
import { after, before } from 'mocha';
import * as path from 'path';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

const testFolderLocation = '/../../../src/test/examples/';

suite('Extension Test Suite', () => {
	before(() => {
		vscode.window.showInformationMessage('Start all tests.');
	});
	after(() => {
		vscode.window.showInformationMessage('All tests done!');
	  });

	test('Sample test', () => {
		assert.equal([1, 2, 3].indexOf(5), -1);
		assert.equal([1, 2, 3].indexOf(0), -1);
	});

	test('Parsing simple asm file', async () => {
		// defining URIs for the files used in this test
		const asmFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'example.asm'));
		const hexFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'example_parsed.hex'));
		const parsedFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'example.hex'));

		const document = await vscode.workspace.openTextDocument(asmFile);
		const editor = await vscode.window.showTextDocument(document);

		await vscode.commands.executeCommand('digital-asm.parse-asm', asmFile);

		// getting the content of the files
		let parsedContent = fs.readFileSync(parsedFile.fsPath, 'utf-8');
		const expectedContent = fs.readFileSync(hexFile.fsPath, 'utf-8');

		assert.deepEqual(parsedContent, expectedContent);
	});
});
