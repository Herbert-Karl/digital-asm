# Change Log

All notable changes to the "digital-asm" extension will be documented in this file.

## x.y.z - tbd

* updated dependencies
* internal improvements to test suite
* internal restructuring and improvements to the existing code
* fixed a bug with brk statements being only recognized for breakpoint creation, if written in all caps

## 0.6.0 - 05.09.2020

* updated readme
* removed preview status
* internal improvements for completion

## 0.5.0 - 13.04.2020

* included copyright notices to source code files 
* fixed an error while interfacing the simulator for files with paths longer than 127 utf-8 codepoints
* changed initial debug configuration to use the currently selected file in the debugger

## 0.4.1 - 09.04.2020

* fixed initialConfiguration

## 0.4.0 - 08.04.2020

* parsing command now also generates a .map file next to the .hex and .lst files
* implemented Debugging for .asm files utilizing the Debug Adapter Protocol

## 0.3.0 - 07.04.2020

* added command for running the .asm file in the digital simulator
* changed parsing command to now also generate a .lst file
* added code completion for the asm mnemonics
* added hover texts for the asm mnemonics
* implemented a remoteInterface for digital simulator

## 0.2.1 - 24.03.2020

* fixed command for parsing

## 0.2.0 - 23.02.2020

* added extension entry point
* added properties for accessing the digital simulator and asm3 programm
* added basis for test suite
* added command for parsing .asm files into .hex files

## 0.1.0 - 01.12.2019

* basic Language Grammar Definition

---

Copyright © 2020 Herbert Bärschneider

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.