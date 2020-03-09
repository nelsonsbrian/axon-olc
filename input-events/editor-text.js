'use strict';

const sprintf = require('sprintf-js').sprintf;
const pluralize = require('pluralize');
const path = require('path');
const Joi = require('@hapi/joi');
const { Broadcast: B, EventUtil, Logger } = require('ranvier');
const DU = require('../lib/DisplayUtil');
const { capitalize: cap, objClass, findER } = require('../lib/StringUtil');

module.exports = () => {
  return {
    event: state => (player, inputConfig) => {
      const fileName = path.basename(__filename, '.js');

      const socket = player.socket;
      const say = EventUtil.genSay(socket);
      const write = EventUtil.genWrite(socket);

      const { none, menuMap, eventStack } = inputConfig;
      const optionConfig = Object.assign({
        text: '',
        params: { min: 0, max: Infinity },
        displayProperty: 'Message',
        showTitle: true,
        fileName,
      }, menuMap.get(fileName));
      menuMap.set(fileName, optionConfig);
      inputConfig.fileName = fileName;

      let { text, displayProperty, onExit, showTitle, params } = optionConfig;
      let { min, max } = params;

      DU.olcHeader(player, inputConfig);

      if (showTitle) {
        say(`<cyan>|</cyan> <b><green>Editor: <yellow>@s</yellow> saves, <yellow>@a</yellow> aborts, <yellow>@h</yellow> for help.</b></green>`);
        say(`<cyan>|</cyan> <green>Current:</green>`);
        if (text.length) {
          say(DU.editorTextDisplayValue(text, 'white'));
        } else {
          say(`<cyan>|</cyan> ${none}\r\n`)
        }
      }
      optionConfig.showTitle = false;

      say(`<cyan>|\r\n\`-></cyan> Enter ${displayProperty} <cyan>(min: ${min}, max: ${max})</cyan>:`);


      socket.once('data', data => {
        data = data.toString().trim();

        // Parse the command
        data = data.toString();
        let parsed = data.match(/^(@[achlns])|(@d)(\d+)|(@[ei])(\d+)\s+(.*)|(@f[i]?)$|(@r[a]?)\s+'([^']+)'\s+'([^']*)'/) || [data];
        parsed = parsed.filter(n => n);  // weed out undefined elements left over from the regex
        let cmd = parsed[1];
        let lines;
        switch (cmd) {
          case '@a':
            onExit(optionConfig);
            menuMap.delete(fileName);
            say(`<white>${displayProperty} change aborted.</white>`);
            return socket.emit(eventStack.pop(), player, inputConfig);
          case '@c':
            optionConfig.text = '';
            say(`Ok, you've cleared the buffer.`);
            return socket.emit(fileName, player, inputConfig);
          case '@d':
          case '@e':
            let lineNum = Number(parsed[2]);
            lines = text.split('\r\n');
            if (0 <= lineNum && lineNum > lines.length) {
              say(`Line ${parsed[2]} does not exist!`);
            } else {
              if (cmd === '@d') {
                lines.splice(lineNum - 1, 1); // Use splice to delete the line specified.
                optionConfig.text = lines.join('\r\n');
                say(`Ok, line ${lineNum} deleted.`);
              } else {
                lines[lineNum - 1] = parsed[3];  // replace the line specified with the text given.
                if (lines.join('\r\n').length > max) {
                  say(`${displayProperty} cannot be longer than ${max} characters. Try again.`);
                  return socket.emit(fileName, player, inputConfig);
                }
                optionConfig.text = lines.join('\r\n');
                say(`Ok, line ${lineNum} edited.`);
              }
              say(DU.editorTextDisplayValue(text, 'white'));
            }
            return socket.emit(fileName, player, inputConfig);

          case '@f':
          case '@fi':
            // Format for width
            if (text.length > 75) {
              // Format Indentation
              if (cmd === '@fi') {
                // Place a 5-space indentation at the beginning of every line.
                optionConfig.text = text.replace(/([^\r\n]{69,}\r\n)/g, '     $1');
              }

              // Format Width
              function formatWidth(textArray, idx) {
                if (idx <= textArray.length - 1) {
                  let currLine = textArray[idx];
                  if (currLine.length >= 75) {
                    let trunc = currLine.substring(0, currLine.lastIndexOf(' ', 74));
                    let carry = currLine.substring(currLine.lastIndexOf(' ', 74)).trimStart();
                    textArray[idx] = trunc;
                    textArray.splice(idx + 1, 0, carry);  // Insert a new element into the array and paste in the carry-over.
                  }
                  formatWidth(textArray, idx + 1);
                }
              }

              lines = text.split('\r\n');
              formatWidth(lines, 0);
              optionConfig.text = lines.join('\r\n');
              say('Ok, buffer formatted.');
            }
            else {
              say('Nothing to format.');
            }
            return socket.emit(fileName, player, inputConfig);

          case '@h':
            say(`<cyan>|</cyan> <b><yellow>@a           </yellow></b> <green>-</green> aborts editor`);
            say(`<cyan>|</cyan> <b><yellow>@c           </yellow></b> <green>-</green> clears buffer`);
            say(`<cyan>|</cyan> <b><yellow>@d#          </yellow></b> <green>-</green> deletes a line #`);
            say(`<cyan>|</cyan> <b><yellow>@e# <text>   </yellow></b> <green>-</green> changes the line at # with <text>`);
            say(`<cyan>|</cyan> <b><yellow>@f           </yellow></b> <green>-</green> formats text`);
            say(`<cyan>|</cyan> <b><yellow>@fi          </yellow></b> <green>-</green> indented formatting of text`);
            say(`<cyan>|</cyan> <b><yellow>@h           </yellow></b> <green>-</green> list text editor commands`);
            say(`<cyan>|</cyan> <b><yellow>@i# <text>   </yellow></b> <green>-</green> inserts <text> before line #`);
            say(`<cyan>|</cyan> <b><yellow>@l           </yellow></b> <green>-</green> lists buffer`);
            say(`<cyan>|</cyan> <b><yellow>@n           </yellow></b> <green>-</green> lists buffer with line numbers`);
            say(`<cyan>|</cyan> <b><yellow>@r 'a' 'b'   </yellow></b> <green>-</green> replace 1st occurrence of text <a> in buffer with <b>`);
            say(`<cyan>|</cyan> <b><yellow>@ra 'a' 'b'  </yellow></b> <green>-</green> replace all occurrences of text <a> in buffer with <b>`);
            say(`<cyan>|</cyan> <b><yellow>             </yellow></b> <green> </green> usage: /r[a] 'pattern' 'replacement'`);
            say(`<cyan>|</cyan> <b><yellow>@s           </yellow></b> <green>-</green> saves text`);
            return socket.emit(fileName, player, inputConfig);

          case '@i':
            lines = text.split('\r\n');
            if (0 <= Number(parsed[2]) && Number(parsed[2]) > lines.length) {
              say(`Line ${parsed[2]} does not exist!`);
            }
            else {
              lines.splice(Number(parsed[2]) - 1, 0, parsed[3]);  // Insert a new element into the array containing our new text.
              if (lines.join('\r\n').length > max) {
                say(`${displayProperty} cannot be longer than ${max} characters. Try again.`);
                return socket.emit(fileName, player, inputConfig);
              }
              optionConfig.text = lines.join('\r\n');
              say('Ok, line inserted.');
            }
            return socket.emit(fileName, player, inputConfig);

          case '@l':
          case '@n':
            if (cmd === '@n') {
              let lines = text.split('\r\n');
              lines.pop();  // remove the trailing CRLF
              say(`<cyan>|</cyan> <green>Current (with line numbers):</green>`);
              say(DU.editorTextWithLineNumbers(text, 'white'));
            }
            else {
              say(`<cyan>|</cyan> <green>Current:</green>`);
              say(DU.editorTextDisplayValue(text, 'white'));
            }
            return socket.emit(fileName, player, inputConfig);

          case '@r':
            lines = text;
            const newTextR = lines.replace(new RegExp(parsed[2]), parsed[3]);
            if (newTextR.length > max) {
              say(`${displayProperty} cannot be longer than ${max} characters. Try again.`);
              return socket.emit(fileName, player, inputConfig);
            }
            say(`Ok, replaced '${parsed[2]}' with '${parsed[3]}'.`);
            optionConfig.text = newTextR;
            return socket.emit(fileName, player, inputConfig);

          case '@ra':
            lines = text;
            const newTextRA = lines.replace(new RegExp(parsed[2], 'g'), parsed[3]);
            if (newTextRA.length > max) {
              say(`${displayProperty} cannot be longer than ${max} characters. Try again.`);
              return socket.emit(fileName, player, inputConfig);
            }
            say(`Ok, replaced all occurences of '${parsed[2]}' with '${parsed[3]}'.`);
            optionConfig.text = newTextRA;
            return socket.emit(fileName, player, inputConfig);

          case '@s':

            if (text.length < min || text.length > max) {
              say(`${displayProperty} length must be between ${min} and ${max} characters. Try again.`);
              return socket.emit(fileName, player, inputConfig);
            }

            onExit(optionConfig, cmd);
            menuMap.delete(fileName);
            say(`${displayProperty} saved.`);
            return socket.emit(eventStack.pop(), player, inputConfig);
          default:

            if (text.length + data.length > max) {
              say(`${displayProperty} cannot be longer than ${max} characters. Try again.`);
              return socket.emit(fileName, player, inputConfig);
            }

            optionConfig.text = text + data + '\r\n';
            say(']');
            optionConfig.showTitle = true;
            return socket.emit(fileName, player, inputConfig);
        }

      });

    }
  };
};
