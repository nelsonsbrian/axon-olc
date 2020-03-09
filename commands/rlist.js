'use strict';

const sprintf = require('sprintf-js').sprintf;
const { Broadcast: B, PlayerRoles } = require('ranvier');
const SU = require('../lib/StringUtil');

module.exports = () => {

  return {
    usage: 'rlist [-u | -<bgcolor>] [area]',
    requiredRole: PlayerRoles.BUILDER,
    command: (state) => (args, player, arg0) => {
      let [bgColor, area] = args.split(' ');
      let padChar = '.'

      if (!bgColor) {
        bgColor = 'bgblack'
        area = player.room.area;
      } else {
        if (bgColor.startsWith('-')) {
          bgColor = bgColor.replace('-', '');  // strip off our option-indicating hyphen.
          padChar = ' ';  // since using a color, assume we don't need these anymore.
          if (!area) {
            area = player.room.area;
          }
        } else {
          const areaSearch = bgColor;
          bgColor = 'bgblack';

          const findAreaPartial = SU.bestMatch(areaSearch, [...state.AreaManager.areas.keys()]);
          area = state.AreaManager.getArea(findAreaPartial);

          if (!area) {
            return B.sayAt(player, `Can't find the area of ${areaSearch}.`);
          }
        }
      }

      const rooms = [...area.rooms.values()].sort((a, b) => a.id - b.id);
      const idLength = rooms.reduce((acc, room) => Math.max(room.id.toString().length, acc), 10);

      let i = 0;
      let msg = `<bgcolor><green>%4d</green><white>) [</white><green>%${idLength}s</green><white>]</white> <cyan>%-50s</cyan><yellow>%s</yellow></bgcolor>`;
      B.sayAt(player, sprintf(`<green>%4s</green><white>)</white> <green>%${idLength + 2}s</green> <cyan>%-50s</cyan><yellow>[%4s]</yellow>`, '#', 'ID', 'Room Name', 'Exits'));
      B.sayAt(player, `<white>----- ${B.line(idLength + 2, '-')} ------------------------------------------------- ------------------</white>`);
      rooms.forEach((room, key, map) => {
        i += 1;
        let title = sprintf('%-50s', room.title).replace(/\s{1}(?=\s)/g, i % 2 ? ' ' : padChar);
        let exits = room.exits.reduce((a, b) => {
          let next = b.roomId.split(':')[0] !== area.name ? `(${b.roomId})` : '';
          return a.concat(next);
        }, '');
        B.sayAt(player, sprintf(msg.replace(/bgcolor>/g, i % 2 ? 'bgblack>' : bgColor + '>'), i, room.id, title, exits));
      });
    }
  }
};