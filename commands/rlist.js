'use strict';

const sprintf = require('sprintf-js').sprintf;
const { Broadcast: B, PlayerRoles } = require('ranvier');
const SU = require('../lib/StringUtil');

module.exports = () => {

  return {
    usage: 'rlist [area]',
    requiredRole: PlayerRoles.BUILDER,
    command: (state) => (args, player, arg0) => {
      let [areaSearch,] = args.split(' ');
      let padChar = '.', area;

      if (areaSearch) {
        const { target, area: resultArea, idNum } = SU.findER(state, player, 'area', areaSearch);
        area = resultArea;
      } else {
        area = player.room.area;
      }

      if (!area) {
        return B.sayAt(player, `Can't find the area of ${areaSearch}.`);
      }

      const rooms = [...area.rooms.values()].sort((a, b) => a.id - b.id);
      const idLength = rooms.reduce((acc, room) => Math.max(room.id.toString().length, acc), 10);

      let i = 0;
      let msg = `<green>%4d</green><white>) [</white><green>%${idLength}s</green><white>]</white> <cyan>%-50s</cyan><yellow>%s</yellow>`;
      B.sayAt(player, sprintf(`<green>%4s</green><white>)</white> <green>%${idLength + 2}s</green> <cyan>%-50s</cyan><yellow>[%4s]</yellow>`, '#', 'ID', 'Room Name', 'Exits'));
      B.sayAt(player, `<white>----- ${B.line(idLength + 2, '-')} ------------------------------------------------- ------------------</white>`);
      rooms.forEach((room, key, map) => {
        i += 1;
        let title = sprintf('%-50s', room.title).replace(/\s{1}(?=\s)/g, i % 2 ? ' ' : padChar);
        let exits = room.exits.reduce((a, b) => {
          let next = b.roomId.split(':')[0] !== area.name ? `(${b.roomId})` : '';
          return a.concat(next);
        }, '');
        B.sayAt(player, sprintf(msg, i, room.id, title, exits));
      });
    }
  }
};