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
            const hexFile = path.join(__dirname + testFolderLocation + 'example_parsed.hex');
            // for the test we create our own small tcp listeing server
            let server = net.createServer();
            server.listen(27322, "localhost");
            // we simple answer with the same string for every connection
            server.on('connection', function(socket) {
                socket.write("ok:001f");
            });

            let remoteInterface = new RemoteInterface("localhost", 27322);
            assert.equal(await remoteInterface.step(), "ok:001f");
            assert.equal(await remoteInterface.run(), "ok:001f");

            // cleanup
            server.close();
		});

});
