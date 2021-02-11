import * as assert from 'assert';
import * as net from 'net';
import { after, before } from 'mocha';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { RemoteInterface } from '../../debugging/remoteInterface';

suite('RemoteInterface Test Suite', () => {
	before(() => {
		vscode.window.showInformationMessage('Start tests for RemoteInterface.');
	});
	after(() => {
		vscode.window.showInformationMessage('Finished tests for RemoteInterface!');
	});

	const hostName = "localhost";
	const tcpPort = 27323;

	test('Sending commands', async () => {
		let simpleTestServer = createListeningServer(hostName, tcpPort);
		correctServerMessage(simpleTestServer);
		let remoteInterface = new RemoteInterface(hostName, tcpPort);
		assert.strictEqual(await remoteInterface.step(), correctAnswerNumber);
		assert.strictEqual(await remoteInterface.run(), correctAnswerNumber);

		simpleTestServer.close();
	});

    test('Sending wrong data',  function(done) {
		let portOffset = 2;
		let simpleTestServer = createListeningServer(hostName, tcpPort+portOffset);
		incorrectServerMessage(simpleTestServer);
		let remoteInterface = new RemoteInterface(hostName, tcpPort+portOffset);
		remoteInterface.run().then(()=>{
			assert.fail("the function shouldn't have returned a value");
		}).catch((err)=>{ 
			assert.strictEqual(err.message, "Error received from simulator: "+incorrectMessage); 
		}).finally(()=> {
			simpleTestServer.close();
			done();
		});
	});

	test('No Server for connection', function(done) {
		this.timeout(0);
		let portOffset = 4;
		let remoteInterface = new RemoteInterface(hostName, tcpPort+portOffset);
		remoteInterface.run().then((val)=>{
			assert.fail("the function shouldn't have returned a value");
		}).catch((err)=>{ 
			assert.strictEqual(err.code, "ECONNREFUSED"); 
			done(); 
		});
    });

	function createListeningServer(hostName: string, port: number): net.Server {
		let simpleTestServer = net.createServer();
		simpleTestServer.listen(port, hostName);
		return simpleTestServer;
	}

	const correctAnswerMessage = "  ok:001f";
	const correctAnswerNumber = 31;

	function correctServerMessage(server: net.Server) {
		defineWriteOnConnection(server, correctAnswerMessage);
	}

	const incorrectMessage = "this is just wrong"; 

	function incorrectServerMessage(server: net.Server) {
		defineWriteOnConnection(server, incorrectMessage);
	}

	function defineWriteOnConnection(server: net.Server, message: string) {
		server.on('connection', (socket) => {
			socket.write(message);
		});
	}

	test('Try start of debugging with too long file path',  async () => {
		let portOffset = 6;
		let _ = createListeningServer(hostName, tcpPort+portOffset);
		let remoteInterface = new RemoteInterface(hostName, tcpPort+portOffset);
		let tooLongPath = createReallyLongString();
		await assert.rejects(remoteInterface.debug(tooLongPath));
    });

	function createReallyLongString(): string {
		let string = "foobar";
		for (let i = 0; i < 16; i++) {
			string = string + string;
		}
		return string;
	}

});
