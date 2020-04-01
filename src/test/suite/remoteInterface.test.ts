import * as assert from 'assert';
import * as fs from 'fs';
import * as net from 'net';
import { after, before } from 'mocha';
import * as path from 'path';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { RemoteInterface } from '../../remoteInterface';

const testFolderLocation = '/../../../src/test/examples/';

suite('RemoteInterface Test Suite', () => {
	before(() => {
		vscode.window.showInformationMessage('Start all tests.');
	});
	after(() => {
		vscode.window.showInformationMessage('All tests done!');
	  });

	test('Sending commands', async () => {
		// for the test we create our own small tcp listeing server
		let server = net.createServer();
		server.listen(27322, "localhost");
		// we simple answer with the same string for every connection
		server.on('connection', function(socket) {
			socket.write("  ok:001f");
		});

		let remoteInterface = new RemoteInterface("localhost", 27322);
		assert.equal(await remoteInterface.step(), 31);
		assert.equal(await remoteInterface.run(), 31);

		// cleanup
		server.close();
	});

    test('Sending wrong data', async () => {
		// for the test we create our own small tcp listeing server
		let server = net.createServer();
		server.listen(27323, "localhost");
		// we simple answer with the same string for every connection
		server.on('connection', function(socket) {
			socket.write("this is just wrong");
		});

		let remoteInterface = new RemoteInterface("localhost", 27323);
		let response = await remoteInterface.run().catch((err)=>{ assert.equal(err.message, "Error received from simulator: "+"this is just wrong"); });

		if(response!==undefined) {
			assert.fail("the function shouldn't have returned a value");
		}

		// cleanup
		server.close();
	});

	test('No Server for connection', async () => {
		const hexFile = path.join(__dirname + testFolderLocation + 'example_parsed.hex');

		let remoteInterface = new RemoteInterface("localhost", 27325);
		let response = await remoteInterface.run().catch((err)=>{ assert.equal(err.code, "ECONNREFUSED"); });

		if(response!==undefined) {
			assert.fail("the function shouldn't have returned a value");
		}
    });

});
