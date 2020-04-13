# digital-asm

[![](https://vsmarketplacebadge.apphb.com/version/Herbert-Karl.digital-asm.svg)](https://marketplace.visualstudio.com/items?itemName=Herbert-Karl.digital-asm)

This VS Code extension provides support for Assembler files for the _digital logic designer and circuit simulator_ [Digital](https://github.com/hneemann/Digital).
It is created as part of a study work at the DHBW Mosbach. 
The extension is licensed unter GPLv3.

## Features

* Language Grammar Definition for the Assembler
* Commands
  * Parsing `.asm` into `.hex`, `.lst` and `.map`
  * Running file in the digital simulator
* code completion for assembler mnemonics
* hover texts for assembler mnemonics
* Debugging of `.asm` files in the digital simulator

## Requirements

* Circuit simulator [Digital](https://github.com/hneemann/Digital) for the digital processor.
  * developed and tested with v0.20.0 (2018-09-03)
* Assembler [ASM 3](https://github.com/hneemann/Assembler) for parsing the file.
  * needs at least v0.6.1

These are not included in the extension and have to be downloaded seperately.

## Extension Settings

This extension contributes the following settings:

* `asm.simulatorHost`: ip address of the host running the digital simulator
* `asm.simulatorPort`: port, at which the digital simulator runs its TcpListener
* `asm.assembler`: location of the jar file of the ASM3 programm
* `asm.brkHandling`: option to handle BRK Mnemonics as Breakpoints when debugging

## How To Use

First, you need to download the required programs: [Digital](https://github.com/hneemann/Digital) and [ASM 3](https://github.com/hneemann/Assembler). 
Before starting to debug a `.asm` file, check that in the extension setting, you filled in the correct path to the `asm3.jar` file. Futhermore, start the simulator Digitial and make sure, you have a debug configuration for this extension in your `launch.json` file. (there is a initial configuration you can let VS Code autogenerate for you)

While debugging, you can use breakpoints and "BRK" statements to stop the running program and inspect it's state. While breakpoints unbound from "BRK" statements can be handy, using at least one of them slows down the program execution considerably. Use only "BRK" statements when possible to enjoy a fast program execution.
The contents of the registers can be viewed via a UI created by the simulator Digital.

The extension settings for the Host and Port of the simulator Digital are correct out of the box for normal uses.

## Known Issues

* Chars not recognized (extension language problem, no influence on the programes itself; might be noticable via themes)
* octal numbers not specifically recognized (extension language problem, no influence on the programes itself; might be noticable via themes)

If you find anything else, please open an issue on GitHub.

## Release Notes

please check the [CHANGELOG.md](CHANGELOG.md) file for release notes.
