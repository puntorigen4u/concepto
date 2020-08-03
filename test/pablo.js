const vue = require('../lib/index');
var myArgs = process.argv.slice(2);

(async () => {
    // testing code here
    let file = (myArgs.length>0)?myArgs[0]:'vue.dsl';
    let base = new vue({ file:file, config:{ debug:true } });
    await base.addCommands(require('./more_commands.js'));
    await base.init();
    nodetest = await base.dsl_parser.getNode({ id: 'ID_789178185' }); // ID_789178185=imagen
    console.log('nodetest dice',nodetest);
    console.time('findCommand');
    let findcom = await base.findCommand(nodetest,false);
    console.timeEnd('findCommand');
    console.log('findCommand reply',findcom);

    console.time('findCommandValid4Eval');
    let findcom2 = await base.findCommandValid4Eval(nodetest,false);
    console.timeEnd('findCommandValid4Eval');
	console.log('findCommandValid4Eval reply',findcom2);

    console.log('total time passed, since constructor: '+base.secsPassed_()+' secs');
    // call writer (when it exists haha)
    //

})().catch(err => {
    console.error(err);
});
