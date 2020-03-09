# Setup

## Note about Axon...

This is a work in progress and many of the details will be fleshed out in the future. Right now the goal is to support the default entity properties that `Ranvier` supports out of the box. It will be assumed that the developer will need to expand upon this module as it would be impossible to make a flexible module while making it specific enough for YOUR specific needs.

This bundle will be opened up for PRs soon.

## Install Axon-OLC

### SubModule
From the `Ranvier` root directory:

```
npm run install-bundle https://github.com/nelsonsbrian/axon-olc.git
```

Open `ranvier.json` and add `axon-olc` to bundles

Navigate to `axon-olc` directory at `/bundles/axon-olc` and type `npm install`.

Additional Resources: https://ranviermud.com/bundles/

### Add Code
Inside of the `input-events/commands/` add the following code for OLC operation.
```     
 function loop () {
    // OLC command bypass
    if (player.otherInput) {
      player.otherInput = false;
      return;
    } // end bypass
    player.socket.emit('commands', player);
}
```

## Known Issues
*Does not save and will most likely crash in if exiting the editor and selecting `yes` to save.


## Common OLC Commands
`rlist [areaName]` - lists all the rooms in the specified area. No-arg defaults to current area of player.

`redit <roomEntityReference | .>` - Opens the editor for the room. No-arg and . defaults to current room. `roomEntityReference` has  partial lookup. For example, a room with entityReference of `magicForest:1` can be accessed by typing `redit mag:1` as long as there are no other area's with that name higher in the alphabetical order.

