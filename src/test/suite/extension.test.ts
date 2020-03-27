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
		const lstFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'example_listing.lst'));
		const parsedFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'example.hex'));
		const createdListingFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'example.lst'));

		if(fs.existsSync(parsedFile.fsPath)) {
			// if an output file is present before we parse one in this test, we remove it
			fs.unlinkSync(parsedFile.fsPath);
		}
		if(fs.existsSync(createdListingFile.fsPath)) {
			// if an output file is present before we parse one in this test, we remove it
			fs.unlinkSync(createdListingFile.fsPath);
		}

		const document = await vscode.workspace.openTextDocument(asmFile);
		const editor = await vscode.window.showTextDocument(document);

		let errorMessage = await vscode.commands.executeCommand('digital-asm.parse-asm', asmFile);

		assert.ifError(errorMessage);

		// getting the content of the files
		let parsedContent = fs.readFileSync(parsedFile.fsPath, 'utf-8');
		const expectedHexContent = fs.readFileSync(hexFile.fsPath, 'utf-8');
		let listingContent = fs.readFileSync(createdListingFile.fsPath, 'utf-8');
		const expectedLstContent = fs.readFileSync(lstFile.fsPath, 'utf-8');

		assert.deepEqual(parsedContent, expectedHexContent);
		assert.deepEqual(listingContent, expectedLstContent);

		// cleanup
		fs.unlinkSync(parsedFile.fsPath); // removes the output file from this test; subsequent tests should start without a parsed .hex file
		fs.unlinkSync(createdListingFile.fsPath); // removes the output file from this test; subsequent tests should be influenced
	});

	test('Parsing complex asm file', async () => {
		// defining URIs for the files used in this test
		const asmFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'test.asm'));
		const hexFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'test_parsed.hex'));
		const lstFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'test_listing.lst'));
		const parsedFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'test.hex'));
		const createdListingFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'test.lst'));

		if(fs.existsSync(parsedFile.fsPath)) {
			// if an output file is present before we parse one in this test, we remove it
			fs.unlinkSync(parsedFile.fsPath);
		}
		if(fs.existsSync(createdListingFile.fsPath)) {
			// if an output file is present before we parse one in this test, we remove it
			fs.unlinkSync(createdListingFile.fsPath);
		}

		const document = await vscode.workspace.openTextDocument(asmFile);
		const editor = await vscode.window.showTextDocument(document);

		let errorMessage = await vscode.commands.executeCommand('digital-asm.parse-asm', asmFile);

		assert.ifError(errorMessage);

		// getting the content of the files
		let parsedContent = fs.readFileSync(parsedFile.fsPath, 'utf-8');
		const expectedHexContent = fs.readFileSync(hexFile.fsPath, 'utf-8');
		let listingContent = fs.readFileSync(createdListingFile.fsPath, 'utf-8');
		const expectedLstContent = fs.readFileSync(lstFile.fsPath, 'utf-8');

		assert.deepEqual(parsedContent, expectedHexContent);
		assert.deepEqual(listingContent, expectedLstContent);

		// cleanup
		fs.unlinkSync(parsedFile.fsPath); // removes the output file from this test; subsequent tests should start without a parsed .hex file
		fs.unlinkSync(createdListingFile.fsPath); // removes the output file from this test; subsequent tests should be influenced
	});

});
