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
	const fileEncoding = 'utf-8';

	let asmExampleFile: vscode.Uri;
	let hexExampleFile: vscode.Uri;
	let lstExampleFile: vscode.Uri;
	let mapExampleFile: vscode.Uri;
	let parsedExampleFile: vscode.Uri;
	let createdExampleListingFile: vscode.Uri;
	let createdExampleMappingFile: vscode.Uri;
	//
	let asmTestFile: vscode.Uri;
	let hexTestFile: vscode.Uri;
	let lstTestFile: vscode.Uri;
	let mapTestFile: vscode.Uri;
	let parsedTestFile: vscode.Uri;
	let createdTestListingFile: vscode.Uri;
	let createdTestMappingFile: vscode.Uri;

	before(() => {
		vscode.window.showInformationMessage('Start extension tests.');
		
		// defining URIs for the files used in the tests
		asmExampleFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'example.asm'));
	 	hexExampleFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'example_parsed.hex'));
		lstExampleFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'example_listing.lst'));
		mapExampleFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'example_mapping.map'));
		parsedExampleFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'example.hex'));
		createdExampleListingFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'example.lst'));
		createdExampleMappingFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'example.map'));
		// 
		asmTestFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'test.asm'));
		hexTestFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'test_parsed.hex'));
		lstTestFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'test_listing.lst'));
		mapTestFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'test_mapping.map'));
		parsedTestFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'test.hex'));
		createdTestListingFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'test.lst'));
		createdTestMappingFile = vscode.Uri.file(path.join(__dirname + testFolderLocation + 'test.map'));

		// if an output file is present before we parse one in the tests, we remove it
		if(fs.existsSync(parsedExampleFile.fsPath)) { fs.unlinkSync(parsedExampleFile.fsPath); }
		if(fs.existsSync(createdExampleListingFile.fsPath)) { fs.unlinkSync(createdExampleListingFile.fsPath); }
		if(fs.existsSync(createdExampleMappingFile.fsPath)) { fs.unlinkSync(createdExampleMappingFile.fsPath); }
		//
		if(fs.existsSync(parsedTestFile.fsPath)) { fs.unlinkSync(parsedTestFile.fsPath); }
		if(fs.existsSync(createdTestListingFile.fsPath)) { fs.unlinkSync(createdTestListingFile.fsPath); }
		if(fs.existsSync(createdTestMappingFile.fsPath)) { fs.unlinkSync(createdTestMappingFile.fsPath); }

	});
	
	after(() => {
		// cleanup
		fs.unlinkSync(parsedExampleFile.fsPath); // removes the output file from this test; subsequent tests should start without a parsed .hex file
		fs.unlinkSync(createdExampleListingFile.fsPath); // removes the output file from this test; subsequent tests should be influenced
		fs.unlinkSync(createdExampleMappingFile.fsPath); // removes the output file from this test; subsequent tests should be influenced
		// 
		fs.unlinkSync(parsedTestFile.fsPath); // removes the output file from this test; subsequent tests should start without a parsed .hex file
		fs.unlinkSync(createdTestListingFile.fsPath); // removes the output file from this test; subsequent tests should be influenced
		fs.unlinkSync(createdTestMappingFile.fsPath); // removes the output file from this test; subsequent tests should be influenced
	  
		vscode.window.showInformationMessage('Finished extension tests!');
	});

	test('Parsing simple asm file', async () => {
		const document = await vscode.workspace.openTextDocument(asmExampleFile);
		const editor = await vscode.window.showTextDocument(document);

		let errorMessage = await vscode.commands.executeCommand('digital-asm.parse-asm', asmExampleFile);

		assert.ifError(errorMessage);

		// getting the content of the files
		let parsedContent = standardizeLineEnding(fs.readFileSync(parsedExampleFile.fsPath, fileEncoding));
		const expectedHexContent = standardizeLineEnding(fs.readFileSync(hexExampleFile.fsPath, fileEncoding));
		let listingContent = standardizeLineEnding(fs.readFileSync(createdExampleListingFile.fsPath, fileEncoding));
		const expectedLstContent = standardizeLineEnding(fs.readFileSync(lstExampleFile.fsPath, fileEncoding));
		let mappingContent = standardizeLineEnding(fs.readFileSync(createdExampleMappingFile.fsPath, fileEncoding));
		const expectedMapContent = standardizeLineEnding(fs.readFileSync(mapExampleFile.fsPath, fileEncoding));

		assert.deepStrictEqual(parsedContent, expectedHexContent);
		assert.deepStrictEqual(listingContent, expectedLstContent);
		assert.deepStrictEqual(mappingContent, expectedMapContent);
	});

	test('Parsing complex asm file', async () => {
		const document = await vscode.workspace.openTextDocument(asmTestFile);
		const editor = await vscode.window.showTextDocument(document);

		let errorMessage = await vscode.commands.executeCommand('digital-asm.parse-asm', asmTestFile);

		assert.ifError(errorMessage);

		// getting the content of the files
		let parsedContent = standardizeLineEnding(fs.readFileSync(parsedExampleFile.fsPath, fileEncoding));
		const expectedHexContent = standardizeLineEnding(fs.readFileSync(hexExampleFile.fsPath, fileEncoding));
		let listingContent = standardizeLineEnding(fs.readFileSync(createdExampleListingFile.fsPath, fileEncoding));
		const expectedLstContent = standardizeLineEnding(fs.readFileSync(lstExampleFile.fsPath, fileEncoding));
		let mappingContent = standardizeLineEnding(fs.readFileSync(createdExampleMappingFile.fsPath, fileEncoding));
		const expectedMapContent = standardizeLineEnding(fs.readFileSync(mapExampleFile.fsPath, fileEncoding));

		assert.deepStrictEqual(parsedContent, expectedHexContent);
		assert.deepStrictEqual(listingContent, expectedLstContent);
		assert.deepStrictEqual(mappingContent, expectedMapContent);
	});

});

// replaces all \r\n with \n to end any problems with platform specific line endings when generating the test files
function standardizeLineEnding(content: string): string {
	return content.replace(/\r\n/gi, "\n");
}