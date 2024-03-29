/**
* Concepto DSL Base Class: A base class (to be extended) for defining new languages for Concepto to be compiled to.
* @name 	concepto
* @module 	concepto
**/

//import commands from '../../vue_dsl/lib/commands';

/**
 * An autocomplete object representing an item within the autocomplete list
 * @typedef {Object} AutocompleteItem
 * @property {string[]} parentsAll - Optionally indicates if this node item needs to have all of these parents (node texts for now).
 * @property {string[]} parents - Optionally indicates if this node item needs to have any of these parents (node texts for now).
 * @property {string} extends_ - Optionally indicates if this item extends another existing one.
 * @property {string} text - Indicates the text to show; aka keyword to complete.
 * @property {string} hint - Indicates the html to show as the summary for the keyword.
 * @property {string[]} icons - Array with icon names used in the node.
 * @property {number[]} level - Array with supported level numbers.
 * @property {Object} attributes - Object with a key for each attribute supported by the node (the key is the attribute name, the value is an object with keys: type, default, hint - supports icon placeholders like {icon:idea} within their texts).
 * @property {Object} events - Object with a key for each event supported by the node.
 */

/**
 * A node object representation of a DSL node.
 * @typedef {Object} NodeDSL
 * @property {number} id - Node unique ID.
 * @property {number} level - Indicates the depth level from the center of the dsl map.
 * @property {string} text - Indicates the text defined in the node itself.
 * @property {string} text_rich - Indicates the html defined in the node itself.
 * @property {string} text_note - Indicates the text/html defined in the notes view of the node (if any).
 * @property {string} image - Image link defined as an image within the node.
 * @property {Object} cloud - Cloud information of the node.
 * @property {string} cloud.bgcolor - Background color of cloud.
 * @property {boolean} cloud.used - True if cloud is used, false otherwise. 
 * @property {Arrow[]} arrows - Visual connections of this node with other nodes {@link #module_concepto..Arrow}.
 * @property {NodeDSL[]} nodes - Children nodes of current node.
 * @property {Object} font - Define font, size and styles of node texts.
 * @property {Object} font.face - Font face type used on node.
 * @property {Object} font.size - Font size used on node.
 * @property {Object} font.bold - True if node text is in bold.
 * @property {Object} font.italic - True if node text is in italics.
 * @property {string} style - Style applied to the node.
 * @property {string} color - Text color of node.
 * @property {string} bgcolor - Background color of node.
 * @property {string} link - Link defined on node.
 * @property {string} position - Position in relation of central node (left,right).
 * @property {Object} attributes - Object with each attribute (key is attribute name, value is attribute value).
 * @property {string[]} icons - Array with icon names used in the node.
 * @property {date} date_modified - Date of node when it was last modified.
 * @property {date} date_created - Date of node when it was created.
 */

/**
 * Arrow object definition, for connections to other nodes within a DSL.
 * @typedef {Object} Arrow
 * @property {string} target - Target node ID of connection.
 * @property {string} color - Color of visual connection.
 * @property {string} style - Graphical representation type of link (source-to-target, target-to-source, both-ways). 
*/
//import dsl_parser from '../../dsl_parser/src/index'
//import console_ from '../../console/src/index'

export default class concepto {

	constructor(file,config={}) {
		if (arguments.length!=2 || typeof arguments[0] === 'object') throw new Error('fatal error! missing file parameter for parser!');
		let console_ = require('@concepto/console'); 
		let me=this;
		let def_config = {
			class:'concepto',
			console:true,
			debug:false,
			cache:true,
			dsl_git:true,
			prefix:''
		};
		this.x_config = {...def_config,...config};
		this.x_console = new console_({ silent:!this.x_config.console });
		this.x_console.setPrefix({ prefix:this.x_config.class, color:'yellow' });
		this.x_flags = { init_ok:false, dsl:file, watchdog:{ start:new Date(), end:new Date() } };
		this.x_commands={}; 	//this.commands();
		this.x_time_stats={ times:{}, tables:{} };
		this.x_state={};	// for dsl parser to share variables within commands and onMethods.
		this.x_memory_cache={
			findCommand: {},
			findValidCommand: {},
			isExactParentID: {},
			hasBrotherBefore: {},
			hasBrotherNext: {},
		};
		this.x_match = require('minimatch');
		// grab class methods that start with the 'on' prefix
		/* @TODO check if this is useful or needed 1-Aug-2020
		this.x_on_methods={};
		let my_methods=getInstanceMethodNames(this);
		for (let i in my_methods) {
			let name = my_methods[i].name;
			if (name.substring(0,2)=='on') {
				delete my_methods[i].name;
				this.x_on_methods[name]=my_methods[i];
			}
		}
		console.log('x_on_methods says',this.x_on_methods);*/
	}

	/**
	* Initializes/starts the class 
	* @async
	*/
	async init() {
		const path = require('path'), tmp = {};
		tmp.directory = path.dirname(path.resolve(this.x_flags.dsl));
		//adds support for generating autocomplete files
		let autocomplete_path = path.join(tmp.directory,'.concepto','.autocomplete');
		try {
			await fs.mkdir(autocomplete_path, { recursive:true });
		} catch(errdir) {
		}
		this.autocomplete = { path:autocomplete_path, records:{}, json:{}, refs:{} };
		//
		if (!this.x_flags.init_ok) {
			let dsl_parser = require('@concepto/dsl_parser');
			let fs = require('fs').promises;
			// show title
			this.x_console.title({ 
				title: `DSL Interpreter ${this.x_config.class.toUpperCase()}\ninit:compiling file:\n${this.x_flags.dsl}`, 
				color: 'cyan',
				config: { align:'left' }
			});
			this.dsl_parser = new dsl_parser({ file:this.x_flags.dsl, config:{ cancelled:true, debug:this.x_config.debug } });
			try {
				await this.dsl_parser.process();
			} catch(d_err) {
				this.x_console.out({ message:`error: file ${this.x_flags.dsl} does't exist!`,data:d_err });
				return;
			}
			this.x_console.outT({ message:`time passed since start .. ${this.secsPassed_()}`, color:'cyan' });
			// @TODO create github compatible DSL
			if (this.x_config.dsl_git) {
				let for_git = await this.dsl_parser.createGitVersion(false, function($) {
					//search aws node (even if it doesn't have the secret icon)
					let aws = $(`node[TEXT=aws] attribute[NAME*=access]`).toArray();
					aws.map(function(elem) {
						let cur = $(elem);
						cur.parent('node').remove();
						/*let dad = cur.parent('node');
						dad.find('attribute').map(function(a,a_elem) {
							let att = $(a_elem);
							att.attr('VALUE','xxxxxxxx');
						});
						dad.append(`<icon BUILTIN="button_cancel"/>`);*/
					});
					//remove nodes with secret icon within config node
					/*
					let secret_config = $(`node[TEXT=config] icon[BUILTIN=password]`).toArray();
					secret_config.map(function(elem) {
						let cur = $(elem);
						cur.parent('node').remove();
					}); */
					//add cancel icon to nodes with secret icon, and replace attr values.
					let secret_config = $(`node[TEXT=config] icon[BUILTIN=password]`).toArray();
					secret_config.map(function(elem) {
						let cur = $(elem);
						let dad = cur.parent('node');
						dad.remove();
						/*dad.find('attribute').map(function(a,a_elem) {
							let att = $(a_elem);
							att.attr('VALUE','xxxx');
						});
						dad.append(`<icon BUILTIN="button_cancel"/>`);*/
					});
					//return modified
					return $.html();
				});
				// save dsl git file
				if (typeof this.x_config.dsl_git === 'boolean') {
					//tmp.dsl_git_path = path.join(tmp.directory,'dsl_git');
					this.x_console.outT({ message:`creating git compatible DSL`, color:'green' });
					tmp.dsl_git_path = tmp.directory;
					this.debug(`dsl_git dir`,tmp.dsl_git_path);
					/*try { 
						await fs.mkdir(tmp.dsl_git_path);
					} catch(cpath_err) {}*/
					//get dsl filename - this.x_flags.dsl
					let git_target = path.join(tmp.dsl_git_path,path.basename(this.x_flags.dsl).replace('.dsl','_git.dsl')); //,path.basename(this.x_flags.dsl)
					await fs.writeFile(git_target,for_git,'utf-8');
					this.debug(`dsl_git file saved as: ${git_target}`);
					this.x_console.outT({ message:`ready github compatible DSL`, color:'green' });
					//
				} else if (typeof this.x_config.dsl_git === 'function') {
					// if dsl_git is a function, call it with out ready content; maybe to send it though sockets, further processing or saving in a diferent location
					this.debug(`calling dsl_git custom method ${this.x_config.dsl_git.name}`);
					await this.x_config.dsl_git(for_git);
				}
				//
				
			}
			//reparse dsl without cancelled nodes
			let remove_cancelled = this.dsl_parser.getParser();
			remove_cancelled('icon[BUILTIN*=button_cancel]').parent().remove();
			/*this.dsl_parser = new dsl_parser({ file:this.x_flags.dsl, config:{ cancelled:false, debug:false } });
			try {
				await this.dsl_parser.process();
			} catch(d_err2) {
			}*/
			//config persistant cache
			this.x_console.outT({ message:`configuring cache ..`, color:'cyan' });
			this.cache = require('node-persist');
			let cache_path = path.join(tmp.directory,'.concepto','.dsl_cache');
			await this.cache.init({
				dir:cache_path,
				expiredInterval: 3*60*60*1000, //expire within 3hrs
				forgiveParseErrors: true
			});
			if (this.x_config.clean && this.x_config.clean==true) {
				this.x_console.outT({ message:`cleaning cache as requested ..`, color:'brightCyan' });	
				await this.cache.clear();
				await this.cleanAutocompleteFiles(); //erase autocomplete files
			}
			//diff_from arg (creates {class}_diff.dsl)
			try {
				if (this.x_config.diff_from) {
					let show_debug = this.x_config.debug;
					this.x_console.outT({ message: `(as requested) creating ${this.x_config.class}_diff.dsl map from ${this.x_config.diff_from}`, color:'brightCyan' });
					let fs = require('fs').promises, path = require('path');
					//read non _git .dsl file source
					let non_git = path.join(tmp.directory,path.basename(this.x_flags.dsl).replace('_git.dsl','.dsl'));
					if (show_debug) this.debug(`diff_from: reading 'non git' file ${non_git}`);
					let non_git_content = await fs.readFile(non_git,'utf-8');
					//read given diff_from file
					let from_dsl = path.resolve(this.x_config.diff_from);
					if (show_debug) this.debug(`diff_from: reading 'diff_from' file ${from_dsl}`);
					let from_content = await fs.readFile(from_dsl,'utf-8');
					//create _diff.dsl file
					let diff_dsl = path.join(tmp.directory,path.basename(this.x_flags.dsl).replace('_git.dsl','.dsl').replace('.dsl','_diff.dsl'));
					if (show_debug) this.debug(`diff_from: future target ${diff_dsl}`);
					//@todo clean CREATED and MODIFIED dates and FOLDED attributos from from_content and non_git_content, before getting differences
					let files = {};
					if (show_debug) this.debug(`diff_from: cleaning: pre-processing diff_from`);
					files.from_parser = new dsl_parser({ file:from_dsl, config:{ cancelled:true, debug:false } });
					try {
						await files.from_parser.process();
					} catch(d_err) {
					}
					if (show_debug) this.debug(`diff_from: cleaning: removing properties for diff`);
					files.from_parser.$(`node`).each(function(i,elem) {
						let me = files.from_parser;
						me.$(elem).attr("CREATED", "1552681669876");
						me.$(elem).attr("MODIFIED", "1552681669876");
						me.$(elem).removeAttr("VSHIFT");
						me.$(elem).removeAttr("HGAP");
						me.$(elem).removeAttr("FOLDED");
						me.$(elem).removeAttr("STYLE");
					});
					//remove attribute_layout tags from comparision
					if (show_debug) this.debug(`diff_from: cleaning: removing attribute_layout for diff`);
					files.from_parser.$(`attribute_layout`).each(function(i,elem) {
						files.from_parser.$(elem).replaceWith('');
					});
					files.from_compare = files.from_parser.$.html();
					if (show_debug) this.debug(`diff_from: cleaning: pre-processing non_git`);
					files.ng_parser = new dsl_parser({ file:non_git, config:{ cancelled:true, debug:false } });
					try {
						await files.ng_parser.process();
					} catch(d_err) {
					}
					files.ng_compare_bak = files.ng_parser.$.html();
					if (show_debug) this.debug(`diff_from: cleaning: removing properties for diff`);
					files.ng_parser.$(`node`).each(function(i,elem) {
						let me = files.ng_parser;
						me.$(elem).attr("CREATED", "1552681669876");
						me.$(elem).attr("MODIFIED", "1552681669876");
						me.$(elem).removeAttr("VSHIFT");
						me.$(elem).removeAttr("HGAP");
						me.$(elem).removeAttr("FOLDED");
						me.$(elem).removeAttr("STYLE");
					});
					//remove attribute_layout tags from comparision
					if (show_debug) this.debug(`diff_from: cleaning: removing attribute_layout for diff`);
					files.ng_parser.$(`attribute_layout`).each(function(i,elem) {
						files.ng_parser.$(elem).replaceWith('');
					});
					files.ng_compare = files.ng_parser.$.html();
					//get differences
					//let compare = await this.dsl_parser.getDifferences(from_content,non_git_content);
					if (show_debug) this.debug(`diff_from: detecting remaining differences`);
					let compare = await this.dsl_parser.getDifferences(files.from_compare,files.ng_compare);
					//if (show_debug) this.debug(`diff_from: raw differences`,compare);
					// reparse.... @todo improve!!!! ... this is just a hack to maintain original format and dates without taking those into account for the diff
					if (show_debug) this.debug(`diff_from: reparsing from_dsl and non_git files`);
					files.from_parser = new dsl_parser({ file:from_dsl, config:{ cancelled:true, debug:false } });
					try {
						await files.from_parser.process();
					} catch(d_err) {
					}
					files.from_compare = files.from_parser.$.html();
					files.ng_parser = new dsl_parser({ file:non_git, config:{ cancelled:true, debug:false } });
					try {
						await files.ng_parser.process();
					} catch(d_err) {
					}
					files.ng_compare = files.ng_parser.$.html();
					//
					let diff = { content:'' };
					//parse diff content
					diff.parser = files.ng_parser;
					diff.content = files.ng_compare; //diff.parser.$.html();
					//remove all previous clouds from diff.content
					if (show_debug) this.debug(`diff_from: cleaning: removing existing cloud tags`);
					let clouds = diff.parser.$(`cloud`);
					clouds.each(function(i,elem) {
						let cur = diff.parser.$(elem);
						cur.replaceWith('');
					});
					//for each added IDs, search and add a Green CLOUD (#d9f7be, green-2)
					if (show_debug) this.debug(`diff_from: adding green clouds to ${Object.keys(compare.added).length} new nodes`);
					for (let key in compare.added) {
						diff.content = await diff.parser.editNode({ node_id:key, children:true, 
							data:function(x) {
								return {
									text_note_html: { p:['ADDED NODE',x.text_note] },
									cloud: {
										used:true,
										bgcolor:'#d9f7be'
									}
								}
							} 
						});
						// get first dad node of 'key' to highlight it as containing a diff
						/*let dads = await diff.parser.getParentNodesIDs({ id:key, array:true });
						let first_node = dads.pop();
						diff.content = await diff.parser.editNode({ node_id:first_node, 
							data:{
									text_note: `!! THIS NODE CONTAINS A *NEW* NODE INSIDE !!`,
									cloud: {
										used:true,
										bgcolor:'#f6ffed' //green-1
									}
								}
						});*/
					}
					//for each modified IDs, search and add a Yellow CLOUD (gold-2)
					let from = {};
					from.parser = files.from_parser;
					/*if (show_debug) this.debug(`diff_from: grouping ${Object.keys(compare.modified).length} modified nodes`);				
					for (let key in compare.modified) {
						let parents = await from.parser.getParentNodesIDs({ id:key, array:true });
						let modified = Object.keys(compare.modified);
						let intersect = this.array_intersect(parents,modified);
						if (intersect.length>0) {
							//there is a dad of ourself within compare.modified; erase ourselfs
							delete compare.modified[key];
						}
					};*/
					if (show_debug) this.debug(`diff_from: adding yellow clouds to ${Object.keys(compare.modified).length} modified nodes`);
					for (let key in compare.modified) {
						diff.content = await diff.parser.editNode({ node_id:key, children:true,
							data:function(x) {
								return {
									text_note_html: { p:['MODIFIED NODE',...compare.modified[key],x.text_note] },
									cloud: {
										used: true,
										bgcolor: '#fff1b8'
									}
								}
							} 
						});
						// get first dad node of 'key' to highlight it as containing a diff
						/*
						let dads = await diff.parser.getParentNodesIDs({ id:key, array:true });
						let first_node = dads.pop();
						diff.content = await diff.parser.editNode({ node_id:first_node, 
							data:{
									text_note: `!! THIS NODE CONTAINS A *MODIFIED* NODE INSIDE !!`,
									cloud: {
										used:true,
										bgcolor:'#fffbe6' //gold-1
									}
								}
						});*/
					}
					//for each deleted IDs, get deleted nodes from the source and add it to diff with a red CLOUD
					//21jun21: get parents of each deleted id, if any parent is within the deleted keys, remove the tested id
					if (show_debug) this.debug(`diff_from: grouping ${Object.keys(compare.deleted).length} deleted nodes`);
					for (let key in compare.deleted) {
						let parents = await from.parser.getParentNodesIDs({ id:key, array:true });
						let deleted = Object.keys(compare.deleted);
						let intersect = this.array_intersect(parents,deleted);
						if (intersect.length>0) {
							//there is a dad of ourself within compare.deleted; erase ourselfs
							delete compare.deleted[key];
						}
					};
					//
					if (show_debug) this.debug(`diff_from: recovering ${Object.keys(compare.deleted).length} deleted nodes and adding them as red cloud nodes`);
					if (Object.keys(compare.deleted).length>0) {
						// get deleted node from 'from_dsl' source file
						//process
						for (let key in compare.deleted) {
							let deleted_node = await from.parser.getNode({ id:key, recurse:true });
							deleted_node.icons = [...deleted_node.icons,'button_cancel'];
							deleted_node.cloud = {
								used: true,
								bgcolor: '#ffa39e',
							};
							deleted_node.text_note_html = { p:['!! DELETED NODE !!','',deleted_node.text_note] };
							// get parent node of deleted_node (to add it to that location within diff)
							let dad = await from.parser.getParentNode({ id:key });
							// add deleted_node as a child of dad within diff
							diff.content = await diff.parser.addNode({ parent_id:dad.id, node:deleted_node });
						}
					}
					//console.log('new diff content',diff.content);
					//console.log('compare results',compare);
					//save new eb_diff.dsl content from differences
					if (show_debug) this.debug(`diff_from: writing _diff.dsl file`);
					try {
						await fs.writeFile(diff_dsl,diff.content,'utf-8', { flag:'w' }); //overwrite by default
					} catch(errwr) {
						//delete existing file and write again
						if (show_debug) this.debug(`diff_from: error writing _diff.dsl file`,errwr);
					}
					this.x_console.outT({ message: `(as requested) file ${this.x_config.class}_diff.dsl created`, color:'brightCyan' });
					//console.log('compare',compare);
					//process.exit(1000);
				}
			} catch(errdiff) {
				this.x_console.outT({ message: `warning: there was an error creating _diff.dsl differences files`, color:'brightRed', data:errdiff });
			}
			//export_html arg (creates an html representation of given dsl file)
			if (this.x_config.export_html) {
				this.x_console.outT({ message: `(as requested) creating html version map to ${this.x_config.export_html}`, color:'brightCyan' });
				let fs = require('fs').promises, path = require('path');
				//use given dsl not, non git -> this.x_flags.dsl
				//transform path given to abs path
				let target_path = path.join(tmp.directory,'out'); //set default target path
				if (this.x_config.export_html!='') {
					target_path = path.resolve(this.x_config.export_html);
				}
				//create target path if it doesn't exist
				try { 
					await fs.mkdir(target_path);
				} catch(cpath_err) {}
				//get our assets path
				let concepto_loc = path.dirname(require.resolve('@concepto/interface')); ///concepto/package.json
				let export_ = path.join(concepto_loc,'lib','export');
				let runtime_ = path.join(export_,'runtime');
				//copy runtime assets to target_path
				let copy = require('recursive-copy');
				try {
					await copy(runtime_, target_path, { overwrite:true });
				} catch(ercp) {}
				//transform to .dsl file to html
				let spawn = require('await-spawn');
				let target_html = path.join(target_path,'index.html');
				let export_xslt = path.join(export_,'toxhtml.xsl');
				await spawn('xsltproc',['-o',target_html,export_xslt,this.x_flags.dsl],{ cwd:tmp.directory });
				let sleep=function(ms) {
					return new Promise(resolve => setTimeout(resolve, ms));
				}
				await sleep(50);
				//search all images/assets used within generated .html
				let cheerio = require('cheerio');
				let generated_html = await fs.readFile(target_html,'utf-8');
				let $ = cheerio.load(generated_html, { ignoreWhitespace: false, xmlMode:true, decodeEntities:false });
				let images = [];
				let me = this;
				$('img[src]').toArray().map(function(elem) {
					let src = $(elem).attr('src');
					if (src.charAt(0)!='.' && images.includes(src)==false) {
						let full_ = path.join(tmp.directory,src);
						images.push(full_);
					}
				});
				//copy existing found images to target_path
				for (let x of images) {
					let y = x.replace(tmp.directory,'');
					let target = path.join(target_path,y);
					try {
						//console.log(`copying ${x} to ${target}`);
						await copy(x,target);
					} catch(ercp) {}
				}
				//copy existing found images to target_path - , data:{images,concepto_loc,export_,runtime_,target_path}
				this.x_console.outT({ message:`export ready`, color:'brightGreen' });
				//process.exit(1500);
				//ready
			}
			// continue
			if (this.x_config.justgit && this.x_config.justgit==true) {
				this.x_console.out({ message:`Stopping after creating DSL GIT version as requested!`, color:'brightYellow'});
				process.exit(1);
			} else {
				this.x_flags.init_ok = true;
				try {
					await this.onInit();
				} catch(eeee) {
					this.x_console.out({ message:`onInit() ${eeee}`, color:'red' });
				}
			}
		} else {
			// this was already called!
			this.x_console.out({ message:`you may only call method init() once!` });
		}
		
	}

	async prepareCommandsAutocomplete() {
        //grab autocomplete keys from x_commands, and add them to autocomplete
        //for each command in x_commands; @todo move this to concepto parent class 
        this.x_console.outT({ message: `Adding x_commands autocomplete definitions!`, color: `cyan` });
        let ac={};
        for (let cmd in this.x_commands) {
            //if command has autocomplete
            if (cmd!='meta' && this.x_commands[cmd].autocomplete) {
                //for each autocomplete key
                for (let key in this.x_commands[cmd].autocomplete) {
                    //this.x_console.outT({ message: `AC ${key} on this.x_commands[${cmd}].autocomplete...`, color: `cyan`, data:this.x_commands[cmd].autocomplete[key] });
                    let tmpItem = this.x_commands[cmd].autocomplete[key];
                    tmpItem.id = key;
                    ac[key] = tmpItem;
                }
            }
        }
        await this.generateAutoComplete(ac);
    }

	params2attr(params) {
        //returns a object with the params as keys, and empty attr object as values
        let resp = {};
        if (typeof params=='string') {                    
            //params is a list string of params, like 'a,b,c'
            params.split(',').forEach((param) => {
                resp[param] = {
                    type: 'string',
                    default: '',
                    hint: ''
                };
            });
        } else if (typeof params=='object') {
            //return params as is, or re-map its keys to match an attr object
            resp = params;
        }
        return resp;
    };

    async generateAutoComplete(auto) {
        const extractIcons = (content,icons) => {
            //extracts the icons from the content ({icon:x}{icon:y}z , returns { content:'z', icons:[x,y] })
            let extract = require('extractjs')({
				startExtract: '[',
				endExtract: ']',
			});
            if (!icons) icons=[];
            let new_ = content;
            let resp = { content, icons };
            if (content.indexOf('{icon:')>-1) {            
                let elements = extract(`{icon:[name]}`,new_);
                if (elements.name && !icons.includes(elements.name)) {
                    icons.push(elements.name);
                    new_ = new_.replace(`{icon:${elements.name}}`,''); 
                    resp.content = new_;
                    resp.icons = icons;
                    if (new_.indexOf('{icon:')!=-1) {
                        resp = extractIcons(new_,icons);
                    }
                }
            }
            return resp;
        };
		// normalize AC objects
		let auto2 = {};
		Object.keys(auto).forEach((key) => {
			const baseObj = {
				id: key,
				text: key,
				type: '',
				icons: [],
				level: [],
				parents: [],
				parentsAll: [],
				hint: '',
				childrenTypes: [],
				attributes: {},
				events: {}
			};
			auto2[key] = {...baseObj,...auto[key]};
			if (!auto2[key].text) {
				auto2[key].text = key;
			}
		});
		auto = {...auto2};
        /* add support for remapping attributes.'posibleChildren' key existance */
        Object.keys(auto).forEach((tag) => {
			let cleanedTag = tag.replaceAll('*-','').replaceAll('-*','').replaceAll(':*',':');
            // add 'type' to auto[tag] if 'icons' contain 'idea'=view, 'help'=event, 'penguin'=script, 'desktop_new'=command
            if (auto[tag].type.trim()=='') {
                if (auto[tag].icons && auto[tag].icons.includes('idea')) {
                    auto[tag].type = 'view';
                } else if (auto[tag].icons && auto[tag].icons.includes('help')) {
                    auto[tag].type = 'event';
                } else if (auto[tag].icons && auto[tag].icons.includes('penguin')) {
                    auto[tag].type = 'script';
                } else if (auto[tag].icons && auto[tag].icons.includes('desktop_new')) {
                    auto[tag].type = 'command';
                }
            }
            // for each attribute
            Object.keys(auto[tag].attributes).forEach((attr_) => {
                // remove all {icon:x} strings from attr_
                let attr__ = attr_.replace(/{icon:[^}]*}/g,'');
				cleanedTag = cleanedTag.replace(/{icon:[^}]*}/g,'');
                let attr = auto[tag].attributes[attr_];
                // also add the attribute to the auto object if it contains {icon:list} within its keyname
                const attrIcons = extractIcons(attr_).icons;
				if (attrIcons.length==1 && attrIcons[0]=='list') {
					if (attr.type.length>0) {
						for (let attrType of attr.type.split(',')) {
							//omit some types like 'object' and 'array'
							if (attrType!='object' && attrType!='array') {
								// if the only attribute icon is 'list', then process its 'type' as posible new ac tags
								const typeNameForNewChildren = cleanedTag+'-'+attr__+'-'+attrType;
								// add typeNameForNewChildren to attr childrenTypes
								if (attr.childrenTypes && attr.childrenTypes.length>0) {
									attr.childrenTypes.push(typeNameForNewChildren);
								} else {
									attr.childrenTypes = [typeNameForNewChildren];
								}
								//gen unique name for attrType (newTagName)
								let newTagName = cleanedTag+'-'+attr__+'-'+attrType;
								if (!auto[newTagName]) {
									auto[newTagName] = {
										text: attrType,
										type: typeNameForNewChildren,
										parentsAll: [attr__],
										parents: [attr__],
										icons: [],
										level: [],
										hint: `Value of ${attrType} for attribute ${attr__} of ${tag}`,
										childrenTypes: ['none'],
										attributes: {}
									};
								} else {
									if (!auto[newTagName].parents.includes(cleanedTag)) {
										auto[newTagName].parents.push(cleanedTag);
									}
								}
							}
						}
					}

				}
				if (attr_.indexOf('{icon:list}')!=-1) {
					// add attribute itself as an AC item of the parent					
                    let type__ = (attr_.indexOf('{icon:help}')!=-1)?'event-attribute':'attribute';
                    type__ = (attr_.indexOf('{icon:idea}')!=-1)?'view-attribute':type__;
                    let typeNameForNewChildren = cleanedTag+'-'+type__+'-'+attr__;
					// add typeNameForNewChildren to attr childrenTypes
					if (auto[tag].childrenTypes && auto[tag].childrenTypes.length>0) {
						auto[tag].childrenTypes.push(typeNameForNewChildren);
					} else {
						auto[tag].childrenTypes = [typeNameForNewChildren];
					}
					//gen unique name for attrType (newTagName)
					let newTagName = typeNameForNewChildren;
					//
					if (!auto[newTagName]) {
                        auto[newTagName] = {
                            text: (attr.text)?attr.text:attr__,
                            type: typeNameForNewChildren,
							parentsAll: [cleanedTag],
                            parents: [cleanedTag], //@TODO this should be parentTypes, or parentsAll (but IDE lacks support for it yet)
                            icons: extractIcons(attr_).icons,
                            level: [],
                            hint: attr.hint,
                            childrenTypes: (attr.childrenTypes)?attr.childrenTypes:[],
                            attributes: (attr.attributes)?attr.attributes:{}
                        };
						if (attr.parentsAll && Array.isArray(attr.parentsAll)) {
							auto[newTagName].parentsAll = Array.concat(attr.parentsAll,auto[newTagName].parentsAll);
						}
						// if attr.text also exists within auto[*].text and childrenTypes here is empty, 
						// then copy childrenTypes and parentsAll from it
						let targetAC = Object.keys(auto).filter((key)=>{
							const item = auto[key];
							if (item && auto[newTagName].type.indexOf(item.type)!=-1 && item.childrenTypes && item.childrenTypes.length>0 && item.text==auto[newTagName].text) {
								return true;
							}
						});
						const targetNode = (targetAC.length>0)?auto[targetAC[0]]:null;
						//console.log('targetNode',targetNode);
						const weNode = auto[newTagName];
						if (targetNode && weNode.childrenTypes.length==0) {
							auto[newTagName].childrenTypes = [...targetNode.childrenTypes];
							if (targetNode.parentsAll.length>0 && weNode.parentsAll.length==0) {
								auto[newTagName].parentsAll = [...targetNode.parentsAll];
							}
						}
                    } else {
                        // if it already existed, add to parents array if it was not there already
                        if (!auto[newTagName].parents.includes(cleanedTag)) auto[newTagName].parents.push(cleanedTag);
                    }
                    //
                }
            });
            // for each event, create an auto[tag] item if it doesn't exist, and add 'tag' as a parents item (if it wasn't there already)
            if (auto[tag].events) {
                
                Object.keys(auto[tag].events).forEach((event) => {
                    if (!auto[event]) {
                        auto[event] = {
                            text: event,
                            type: 'event',
                            parents: [tag],
                            icons: ['help'],
                            level: [],
                            childrenTypes: (auto[tag].events[event].childrenTypes)?auto[tag].events[event].childrenTypes:[],
                            hint: auto[tag].events[event].hint,
                            attributes: (auto[tag].events[event].params)?this.params2attr(auto[tag].events[event].params):(auto[tag].events[event].attributes)?auto[tag].events[event].attributes:{}
                        };
                    } else {
                        // if it already existed, add to parents array if it was not there already
                        if (!auto[event].parents.includes(tag)) auto[event].parents.push(tag);
                    }
                });
            }
        });
        //console.log('auto POST',auto);
        //
        let tags = Object.keys(auto).map((tag) => {
            return {
                id: tag,
                text: (auto[tag].text && auto[tag].text!='')?auto[tag].text:tag, //.replaceAll('*',''),
                //text: tag, //.replaceAll('*',''),
                childrenTypes: (auto[tag].childrenTypes)?auto[tag].childrenTypes.map((item)=>item.replace(/{icon:[^}]*}/g,'')):[],
                type: (auto[tag].type)?auto[tag].type:'',
                icons: auto[tag].icons,
                level: auto[tag].level,
                hint: auto[tag].hint,
                attributes: auto[tag].attributes,
                events: (auto[tag].events)?auto[tag].events:{},
                extends_: (auto[tag].extends_)?auto[tag].extends_:'',
                parentsAll: (auto[tag].parents)?auto[tag].parentsAll:[],
                parents: (auto[tag].parents)?auto[tag].parents:[],
            }
        });
        // add to context
        for (let key in tags) {
            await this.addAutocompleteDefinition(tags[key]);
        }
    }

	async cleanAutocompleteFiles() {
		// erase all autocomplete files of project 
		const fs = require('fs').promises;
		const path = require('path');
		try {
			for (const file of await fs.readdir(this.autocomplete.path)) {
				await fs.unlink(path.join(this.autocomplete.path, file));
			}
		} catch(xx) {
		}
	}

	/**
	* Renders an HTML template for displaying an autocomplete item within the IDE
	* Should return the rendered HTML
	*
	* @async
	* @param 	{AutocompleteItem}		record					- autocomplete item record
	* @param 	{Object}				render					- render object with default methods for rendering autocomplete items
	* @param 	{function}				render.placeholders		- internal function to escape {icon}:x placeholders; returns modified string with rendered icons
	* @param 	{function}				render.icon				- internal function to call to render any given icon into an img tag; you can either call this or use your own method within the code
	* @param 	{function}				render.attrs			- internal function to call to render the item attributes as an html table
	* @return 	{string}										- HTML template

	*/

	async autocompleteContentTemplate(record, render) {
		// param record is an autocomplete object for a given item
		// returns the template to show in an autocomplete view
		const keyword = render.placeholders(record.text);
		const hint = render.placeholders(record.hint);
		const icons = (record.icons)?record.icons:[];
		const type = (record.type)?record.type:'internal';
		let attributes = record.attributes;
		const events = (record.events)?record.events:{};
		//
		let html = '';
		for (let icon of icons) {
			if (render.icon) {
				html += render.icon(icon);
			}
		}
		html += `<b>${keyword}</b><br /><br />`;
		if (record.extends_ && record.extends_!='') {
			html += render.placeholders(`Extends {icon:idea}<b>${record.extends_}</b>.&nbsp;`);
		}
		html += `${hint}<br /><br />`;
		html += render.attrs(attributes,render.icon) + '<br />';
		//;
		return html;
	}

	async generateAutocompleteFiles() {
		//reads object this.autocomplete.records and generates autocomplete files in the autocomplete folder
		this.x_console.outT({ message:`generating autocomplete files`, color:'brightCyan' });
		//adds support for generating autocomplete files
		const path = require('path'), tmp = {}, fs = require('fs').promises;
		const tmp_directory = path.dirname(path.resolve(this.x_flags.dsl));
		let autocomplete_path = path.join(tmp_directory,'.concepto','.autocomplete');
		try {
			await fs.mkdir(autocomplete_path, { recursive:true });
		} catch(errdir) { }
		if (!this.autocomplete) {	
			this.autocomplete = { path:autocomplete_path, records:{}, json:{}, refs:{} };
		} else {
			this.autocomplete.path = autocomplete_path;
		}
		//get x_commands meta data object
		//const meta_ = Object.keys(this.x_commands.meta)[0]; //x_commands meta data for first lib of x_commands 
		const meta = this.x_commands.meta;
		delete meta.hint; delete meta.func; 
		//this.x_console.outT({ message:`DSL meta data`, color:'brightCyan', data:this.x_commands.meta });
		//get x_commands name & language definitions
		const apiLang = meta.name; // has the name of the compiler used (e.g. 'NuxtJS')
		let lang = meta.language; // es,en (language for the autocomplete definitions)
		//default autocomplete theme values
		let theme = {
			table_bgcolor: "#AAD3F3",
			tr0_bgcolor: "#AAD3F3",
			tr_bgcolor: "#AAD3F3",
			tr_inherited_bgcolor: "#C3C3C3",
			cellpadding: 2,
			cellspacing: 0,
		};
		// overwrite with given theme if defined
		let custom_theme = (meta.autocomplete && meta.autocomplete.theme)?meta.autocomplete.theme:{};
		theme = { ...theme, ...custom_theme };
		lang = lang?lang:'es'; //default lang is es (spanish)
		//prepare xml
		let wrapper = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE api SYSTEM "CompletionXml.dtd" >\n<api language="${apiLang}">\n\t<keywords>\n`;
		let wrapper_end = `\t</keywords>\n</api>`;
		//define translation keys
		let poKeys = {
			'en': {
				'Attributes': 'Parameters',
				'Attribute': 'Param',
				'Values': 'Values',
				'Type': 'Type',
				'Default': 'Default',
				'Hint': 'Hint',
			},
			'es': {
				'Attributes': 'Parametros',
				'Attribute': 'Param',
				'Values': 'Valores',
				'Type': 'Tipo',
				'Default': 'Default',
				'Hint': 'Descripción',
			}
		};
		// concepto icons REAL location (for copying autocomplete icons)
		//let path = require('path');
		let iconsPath = '';
		try {
			const root = (require('find-root'))(__dirname)
			//let concepto_loc = path.dirname(require.resolve('@concepto/interface'));
			iconsPath = path.join(root,'lib','export','runtime','icons');
			//this.x_console.outT({message:'iconsPath:'+iconsPath });
			let copy = require('recursive-copy');
			try {
				await copy(iconsPath, this.autocomplete.path, { overwrite:true });
			} catch(ercp) {}
		} catch(eeeec) {
			this.x_console.outT({message:'error determining iconsPath:'+iconsPath });
		}
		/*
		- transform keys from this.autocomplete.records into xmls
		- if generated xml name exists, search 'keyword' tag inside and if it doesn't exist, add it with the new keyword xml
	
		let cheerio = require('cheerio');
		let existing_xml = await fs.readFile(keyfile,'utf-8');
		let $ = cheerio.load(existing_xml, { ignoreWhitespace: false, xmlMode:true, decodeEntities:false });
		*/
		const cheerio = require('cheerio');
		const renderTable = (title, table, render) => {
			let html = `<table width='100%' border=1 cellspacing=${theme.cellspacing} cellpadding=${theme.cellpadding} bordercolor='${theme.table_bgcolor}'>`;
			const header = Object.keys(table[0]);
			//table title
			html += `<tr bgcolor='${theme.tr0_bgcolor}'>`;
			html += `<td colspan='${header.length}' valign='top' align='left'>${title}:</td>`;
			html += `</tr>`;
			//table header
			for (let h of header) {
				html += `<tr bgcolor='${theme.tr0_bgcolor}'>`;
				html += `<td valign='top'>${h}:</td>`;
				html += `</tr>`;
			}
			//table rows
			for (let row in table) {
				html += `<tr bgcolor='${theme.tr_bgcolor}'>`;
				for (let col in table[row]) {
					html += `<td valign='top' align='left'>${render.placeholders(table[row][col])}</td>`;
				}
				html += `</tr>`;
			}
			//close table
			html += `</table>`;
			return html;
		};

		const prepareInherited = (record) => {
			//this.debug('prepareInherited');
			if (record.extends_ && record.extends_!='' && this.autocomplete.refs[record.extends_]) {
				//const merge = require('deepmerge');
				//this.debug('merging inherited attributes/events!!!! ',{ extends_:record.extends_, parent:this.autocomplete.refs[record.extends_] });
				//record = merge(this.autocomplete.texts[record.extends_],record);
				// determine which 'attributes' are from the extends_ record (inherited)
				const parentAttribs = Object.keys(this.autocomplete.refs[record.extends_].attributes);
				const recordAttribs = Object.keys(record.attributes);
				for (let recAttrib of recordAttribs) {
					if (parentAttribs.includes(recAttrib)) {
						record.attributes[recAttrib].inherited_ = true;
					}
				}
				// determine which 'events' are from the extends_ record (inherited)
				const parentEvents = Object.keys(this.autocomplete.refs[record.extends_].events);
				const recordEvents = Object.keys(record.events);
				for (let recEvent of recordEvents) {
					if (parentEvents.includes(recEvent)) {
						record.events[recEvent].inherited_ = true;
					}
				}
			}
			return record;
		};

		const attributesToHTMLTable = (attributes={},renderIcon) => {
			let html = `<table width='100%' border=1 cellspacing=${theme.cellspacing} cellpadding=${theme.cellpadding} bordercolor='${theme.table_bgcolor}'>`;
			//table header
			html += `<tr bgcolor='${theme.tr0_bgcolor}'>
			<td colspan='5' valign='top' align='left'>${poKeys[lang]['Attributes']}:</td>
			</tr><tr bgcolor='${theme.tr0_bgcolor}'>
			<td valign='top' width='10'>R</td>
			<td valign='top'>${poKeys[lang]['Attribute']}</td>
			<td valign='top'>${poKeys[lang]['Type']}</td>
			<td valign='top'>${poKeys[lang]['Default']}</td>
			<td valign='top'>${poKeys[lang]['Hint']}</td>
			</tr>\n`;
			//
			let extract = require('extractjs')({
				startExtract: '-',
				endExtract: '-',
			});
			const escapeSpecial = (text_) => {
				let new_ = text_;
				new_ = new_.replaceAll('->','-&gt;');
				new_ = new_.replaceAll('<-','-&lt;');
				return new_;
			};
			const replaceIcons = (text_,renderIcon_) => {
				if (!renderIcon_) renderIcon_ = renderIcon; 
				/* adds support for icons with {icon:x} within type */
				let new_ = text_;
				if (new_.indexOf(`{icon:`)!=-1) {
					let icons = extract(`{icon:-icon-}`,new_);
					if (icons.icon) {
						new_ = new_.replace(`{icon:${icons.icon}}`,renderIcon_(icons.icon));
						new_ = replaceIcons(new_);
					}
				}
				return new_;
			};
			for (let key in attributes) {
				let hint = (attributes[key].hint)?attributes[key].hint:'';
				let type_ = (attributes[key].type)?attributes[key].type:'';
				let default_ = (attributes[key].default)?attributes[key].default:'';
				//
				if (attributes[key].inherited_) {
					html += `<tr bgcolor='${theme.tr_inherited_bgcolor}'>\n`;
				} else {
					html += `<tr bgcolor='${theme.tr_bgcolor}'>\n`;
				}
				if (attributes[key].required) {
					html += `<td>*</td>\n`;
				} else {
					html += `<td> </td>\n`;
				}
				html += `<td>${replaceIcons(key)}</td>\n`;
				html += `<td>${replaceIcons(escapeSpecial(type_))}</td>\n`;
				html += `<td>${replaceIcons(default_)}</td>\n`;
				html += `<td>${replaceIcons(hint)}</td>\n`;
				html += `</tr>\n`;
			}
			html += `</table>`;
			return html;
		}		

		const replaceIcons = (text_) => {
			/* adds support for icons with {icon:x} within type */
			const extract = require('extractjs')({
				startExtract: '-',
				endExtract: '-',
			});
			let new_ = text_;
			if (new_.indexOf(`{icon:`)!=-1) {
				let icons = extract(`{icon:-icon-}`,new_);
				if (icons.icon) {
					new_ = new_.replace(`{icon:${icons.icon}}`,`<img src="${icons.icon}.png" align="left" hspace="5" vspace="5" valign="middle" />`);
					new_ = replaceIcons(new_);
				}
			}
			return new_;
		};

		//let fs = require('fs').promises;
		//
		// generate .autocomplete/autocomplete.json file 
		//
		let jsonKeys = Object.keys(this.autocomplete.json);
		let autoJson = { nodes:[] };
		if (jsonKeys.length>0) {
			let file = path.join(this.autocomplete.path,'autocomplete.json');
			// generate the html for the hints
			for (let key of jsonKeys) {
				let record = {...this.autocomplete.json[key],...this.autocomplete.refs[key]};
				if (record.hint) {
					record.hint = await this.autocompleteContentTemplate(prepareInherited(record),{
						icon: (icon)=>{
							return `<img src="${icon}.png" align="left" hspace="5" vspace="5" valign="middle" />&nbsp;`;
						},
						placeholders: (text,renderIcon)=>{
							if (renderIcon) {
								//return attributesToHTMLTable(attrs,renderIcon);
								return replaceIcons(text,renderIcon);
							} else {
								return replaceIcons(text,(icon)=>{
									return `<img src="${icon}.png" align="left" hspace="5" vspace="5" valign="middle" />&nbsp;`;
								});
							}
						},
						attrs: (attrs,renderIcon)=>{
							if (renderIcon) {
								return attributesToHTMLTable(attrs,renderIcon);
							} else {
								return attributesToHTMLTable(attrs,default_render_icon);
							}
						}
					});
					//prepend base href for images
					record.hint = `<BASE href="file://${this.autocomplete.path}/">\n`+record.hint;
					//record.hint = `<body bgcolor="white">`+record.hint+`</body>`;
				}
				this.autocomplete.json[key].hint = record.hint;
				record = this.autocomplete.json[key]; //this may not be needed anymore
				//don't push record if it is a '-private-' record key
				if (key.indexOf('-private-')==-1) {
					autoJson.nodes.push(record);
				}
			}
			let json = JSON.stringify(autoJson,null,'\t'); //this.autocomplete.json
			await this.writeFile(file,json);
		}
	}

	/**
	* Adds the given definition for the generation of autocomplete files recods
	* @param 	{String}	[extends_]			- extends autocomplete record;
	* @param 	{Array}		[parentsAll]		- required node parents of this definition; empty means any; * means item must match all parents listed
	* @param 	{Array}		[parents]			- posible node parents of this definition; empty means any; * means item must be partof
	* @param 	{Array}		[childrenTypes]		- posible children type nodes; empty means no restrictions
	* @param 	{String}	[id]				- Unique AC node identifier (usually the 'text')
	* @param 	{String}	[text]				- Node text (ex. 'consultar modelo "x",') to be shown to used within list
	* @param 	{String}	[type]				- Node type (ex. 'view') to be shown to used within list; empty by default
	* @param 	{Array}		[icons]				- Array of icons (in order) for autocomplete node detection
	* @param 	{Array}		[level]				- Array of levels of node definition to be detected (1=root, 2=child, 3=grandchild, etc)
	* @param 	{String}	[hint]				- Hint to show user for command completion
	* @param 	{Object}	[attributes]		- Possible node command attributes (ex. { 'id':{ required:true, type:'number', values:'1,2,3', hint:'id of datamodel' } })
	* @return 	{Object}
	*/
	async addAutocompleteDefinition({id='',text='',type='',extends_='',parentsAll=[],parents=[], childrenTypes=[], icons=[],level=[],hint='',attributes={}, events={}}={}) {
		//this.autocomplete = { path:'path', records:{}, texts:{} }
		//this.autocomplete.records[hash] = { keys,bestKey,text,icons,level,hint,attributes }
		/*
		    key def:
				ex. desktop_new+bell-consultar+modelo-7.xml
				ex. desktop_new bell,consultar modelo,7.xml
				decomposed_key = { //break components by - sign
					icons: ['desktop_new','bell'],
					text: 'consultar+modelo',
					level: 7
				}
		*/
		//prepare input text: get first 16 chars of text and replace spaces and : with +
		//const preparedText = text.trim().substring(0,16).replaceAll(' ','+').replaceAll(':','+');
		//generate all keys alternatives for this definition
		//let keys = [];
		/*
		let key = '';	//best key definition
		if (icons.length>0) {
			key = icons.join('+');
			keys.push(icons.join('+'));	//just the joined icons
		}
		if (preparedText.length>0) {
			if (key.length>0) {
				key += '-';
			}
			keys.push(preparedText);	//just the prepared text
			key += preparedText;
		}
		if (level.length>0) {
			if (key.length>0) {
				key += '-';
			}
			//append the level items to keys using es6
			for (let i of level) {
				keys.push(key+i);	//variations of key with each level
			}
			keys.push(...level);	//add the listed levels as well
			key += level[0];		//just use first level as default for bestkey
		}
		if (icons.length>0 && level.length>0) {
			//icons-level
			for (let i of level) {
				keys.push(icons.join('+') + '-' + i);	//add the listed levels combinations as well	
			}
		}
		if (icons.length>0 && preparedText.length>0) {
			//icons-preparedText
			keys.push(icons.join('+') + '-' + preparedText);	
		}
		if (preparedText.length>0 && level.length>0) {
			//preparedText-level
			for (let i of level) {
				keys.push(preparedText + '-' + i);	//add the listed levels combinations as well
			}
		}*/
		//add to def
		let hash = await this.dsl_parser.hash(arguments);
		if (id=='') id=text;
		this.autocomplete.records[hash] = {
			keys:[],
			bestKey:'',
			text,
			icons,
			level,
			hint,
			attributes,
			events,
			extends_
		};
		//30-nov-22 for new autocomplete.json file support
		this.autocomplete.json[id] = {
			parentsAll,
			parents,
			childrenTypes,
			text,
			type,
			icons,
			level,
			hint
		};
		this.autocomplete.refs[id] = {
			attributes,
			events,
			extends_
		};
		return this.autocomplete.records[hash];
	}

	// **********************************
	// template methods (to be extended)
	// **********************************

	/**
	* Sets the default reply Object for commands
	* @param 	{Object}	[init]				- Merges given object keys with default defined template
	* @return 	{Object}
	*/
	reply_template(init={}) {
		let resp = { init:'', open:'', close:'', hasChildren:true, type:'simple', valid:true, _meta:{ _set:{}, cache:true } };
		return {...resp,...init};
	}

	/**
	* Gets automatically executed after init method finishes.
	* You should place any parser preparation steps here (ex. load commands)
	* @async
	*/
	async onInit() {
		console.log('hello from concepto.js')
	}

	/**
	* Gets automatically executed after parsing all nodes level 2 of the given dsl (before onCompleteCodeTemplate)
	* @async
	* @param 	{Object}		processedNode		- reply content of process method per processed level2 node (keys of reply_template method)
	* @return 	{Object}
	*/
	async onAfterProcess(processedNode) {
		return processedNode;
	}

	/**
	* Gets automatically executed within writer method for setting the title for a node level 2.
	* @async
	* @param 	{NodeDSL}		node		- node to process
	* @return 	{String}
	*/
	async onDefineTitle(node) {
		let resp = node.text;
		Object.keys(node.attributes).map(function(i){
			if (i=='title' || i=='titulo') {
				resp = node.attributes[i];
				return false;
			}
		}.bind(this));
		/*
		for (i in node.attributes) {
			if (node.attributes[i]=='title' || node.attributes[i]=='titulo') {
				resp = node.attributes[i];
				break;
			}
		}*/
		return resp;
	}

	/**
	* Gets automatically executed for naming filename of class/page by testing node (you could use a slud method here).
	* @async
	* @param 	{NodeDSL}		node		- node to process
	* @return 	{String}
	*/
	async onDefineFilename(node) {
		return node.text;
	}

	/**
	* Gets automatically called for naming the class/page by testing node (similar to a filename, but for objects reference).
	* @async
	* @param 	{NodeDSL}		node		- node to process
	* @return 	{String}
	*/
	async onDefineNodeName(node) {
		return node.text.replace(' ','_');
	}

	/**
	* Defines template for code given the processedNodes of writer(). Useful to prepend/append code before writting code to disk.
	* @async
	* @param 	{Object}		processedNode		- reply content of process method per processed level2 node (keys of reply_template method)
	* @return 	{Object}
	*/
	async onCompleteCodeTemplate(processedNode) {
		return processedNode;
	}

	/**
	* Defines preparation steps before processing nodes.
	* @async
	*/
	async onPrepare() {
	}

	/**
	* Gets automatically called after errors have being found while processing nodes (with the defined commands)
	* @async
	* @param 	{string[]}		errors		- array of errors messages
	*/
	async onErrors(errors) {
	}

	/**
	* Gets automatically called after all processing on nodes has being done. You usually create the files here using the received processedNodes array.
	* @async
	* @param 	{Object[]}		processedNodes		- array of nodes already processed (keys of reply_template method) ready to be written to disk
	*/
	async onCreateFiles(processedNodes) {
	}

	/**
	* Gets automatically called after all processes have finished. Useful for cleaning the enviroment.
	* @async
	*/
	async onEnd() {
	}

	// ********************
	// helper methods
	// ********************

	/**
	* A command object specifying requirements for a node to execute its function.
	* @typedef {Object} Command
	* @property {string} [x_icons] 				- List of required icons that the node must define to be a match for this command.
	* @property {string} [x_not_icons] 			- List of icons that the node cannot define to be a match for this command.
	* @property {string} [x_not_empty] 			- List of keys that must not be empty to be a match for this command (can be any key from a NodeDSL object). Example: 'attribute[src],color'
	* @property {string} [x_not_text_contains] 	- List of strings, which cannot be within the node text.
	* @property {string} [x_empty] 				- List of NodeDSL keys that must be empty to be a match for this command.
	* @property {string} [x_text_contains]		- List of strings, that can be contain in node text (if delimiter is |) or that must be all contained within the node text (if delimiter is comma).
	* @property {string|string[]} [x_text_pattern]		- Minimatch pattern to match to be a match for this command. Can also be an array of patterns (one must match).
	* @property {string} [x_level] 				- Numeric conditions that the level of the node must met (example: '>2,<5' or '2,3,4').
	* @property {string} [x_all_hasparent] 		- List of commands ids (keys), which must be ancestors of the node to be a match for this command.
	* @property {string} [x_or_hasparent] 		- List of commands ids (keys), which at least one must be an ancestor of the node to be a match for this command.
	* @property {string} [x_or_isparent] 		- List of commands ids (keys), which at least one must be the exact parent of the node to be a match for this command.
	* @property {Object} [autocomplete] 			- Describes the node for the autocomplete feature of Concepto DSL software and its related documentation. The feature also takes into account the definition of the command (x_level and x_icons)
	* @property {string} [autocomplete.key_text] 	- String that the node text must have for this command to be suggested.
	* @property {string} [autocomplete.hint] 		- Text description for this command to be shown on Concepto DSL.
	* @property {Function} func - Function to execute with a matching node. Receives one argument and it must be a NodeDSL object.
	*/

	/**
	* Add commands for processing nodes with the current class
	* @async
	* @param 	{Function}		command_func		- async function returning an object with commands objects ({@link Command}) where each key is the command id, and its value a Command object.
	*/

	async addCommands(command_func) {
		if (!this.x_flags.init_ok) throw new Error('error! the first called method must be init()!');
		if (command_func && typeof command_func === 'function') { 
			let t = await command_func(this);
			if (typeof t === 'object') {
				// if there was a meta, add new info as name child
				if (this.x_commands && this.x_commands.meta && t.meta && t.meta.name) {
					if  (!this.x_commands.meta.other) this.x_commands.meta.other={};
					this.x_commands.meta.other[t.meta.name] = t.meta;
					delete t.meta;
				}
				this.x_commands = {...this.x_commands,...t};
			} else {
				throw new Error('error! addCommands() argument doesn\'t reply with an Object');
			}
			if (t.meta && t.meta.version && t.meta.name) {
				this.x_console.outT({ message:`x_commands '${t.meta.name}' v${t.meta.version} ready`, color:'brightYellow' });
			}
		} else if (command_func && typeof command_func === 'object') {
			// if there was a meta, add new info as name child
			if (this.x_commands && this.x_commands.meta && command_func.meta && command_func.meta.name) {
				if  (!this.x_commands.meta.other) this.x_commands.meta.other={};
				this.x_commands.meta.other[command_func.meta.name] = command_func.meta;
				delete command_func.meta;
			}
			this.x_commands = {...this.x_commands,...command_func};
			if (command_func.meta && command_func.meta.version && command_func.meta.name) {
				this.x_console.outT({ message:`x_commands '${command_func.meta.name}' v${command_func.meta.version}' ready`, color:'brightYellow' });
			}
		}
	}

	/**
	* Detects which x_commands changed their code since last persistant cache usage. To be called before process().
	* @async
	*/
	async cacheCommands() {
		//add hash of x_commands to cache; if diferent from cache,invalidate node caches!
		let x_cmds_hashes = {}, x_watches = {}, watched_vars={};
		let safe = require('safe-eval');
		for (let x in this.x_commands) {
			if (this.x_commands[x].x_watch) {
				let watched = this.x_commands[x].x_watch.split(',');
				for (let xi in watched) {
					let key = watched[xi];
					if (key.includes('x_state.')) {
						//this is a var value watch, not command
						if (!watched_vars[x]) watched_vars[x]={};
						try {
							watched_vars[x][key.trim()]=safe('this.'+key.trim(),this);
						} catch(doesnt_exist) {
							watched_vars[x][key.trim()]='';
						}
					} else {
						x_watches[watched[xi].trim()] = x;
					}
				}
			}
			if (x=='meta') {
				x_cmds_hashes[x] = await this.dsl_parser.hash(JSON.stringify(this.x_commands[x]));
			} else {
				x_cmds_hashes[x] = await this.dsl_parser.hash(this.x_commands[x].func.toString());
			}
		}
		//console.log('obj_to_hash',x_cmds_hashes);
		let commands_hash = await this.dsl_parser.hash(x_cmds_hashes);
		let commands_cache = await this.cache.getItem('commands_hash');
		let commands_cached_hashes = await this.cache.getItem('commands_hashes');
		let changed_x_cmds = [];
		let watched_vars_hash_now = await this.dsl_parser.hash(watched_vars);
		let watched_vars_hash_cache = await this.cache.getItem('watched_vars_cache');
		let watched_vars_cache = await this.cache.getItem('watched_vars');
		//console.log('PABLO debug: watched_vars_now',{current:watched_vars,cache:watched_vars_cache});
		this.x_console.outT({ prefix:'cache,yellow', message:`x_commands hash: ${commands_hash}`, color:'dim' });
		if (commands_cache!=commands_hash || watched_vars_hash_now!=watched_vars_hash_cache) {
			if (typeof commands_cached_hashes === 'object') {
				//compare which x_commands changed
				for (let x in x_cmds_hashes) {
					if (x in commands_cached_hashes && commands_cached_hashes[x]!=x_cmds_hashes[x]) {
						changed_x_cmds.push(x);
						// search x within x_watches, if x is found, also add that cmd (value) to be cleaned from cache
						if (x in x_watches) {
							if (!changed_x_cmds.includes(x_watches[x])) {
								changed_x_cmds.push(x_watches[x]);
							}
						}
					}
					// search x (cmd) is within watched_vars_cache, search var keys: if value of varkey in cache if diff from actual value, erase cmd from cache
					if (watched_vars_cache && x in watched_vars_cache && x in watched_vars) {
						for (let varkey in watched_vars_cache[x]) {
							if (watched_vars[x][varkey]!=watched_vars_cache[x][varkey]) {
								this.x_console.outT({ prefix:'cache,yellow', message:`watched var value by ${x} changed! requesting rebuild of its instances`, color:'brightYellow' });
								changed_x_cmds.push(x);
							}
						}
					}
				}
				if (changed_x_cmds.includes('meta')) {
					//x_command version changed! wipe all cache
					this.x_console.outT({ prefix:'cache,yellow', message:`x_commands meta changed! wiping all cache`, color:'brightYellow' });
					await this.cache.clear();
					await this.cleanAutocompleteFiles();
				} else {
					if (changed_x_cmds.length>0) this.x_console.outT({ prefix:'cache,yellow', message:`x_commands has changed hash! cleaning cache of x_commands: ${changed_x_cmds.join(',')}`, color:'yellow' });
					//search which pages (within cache) are using the modified x_commands
					let meta_cache = await this.cache.getItem('meta_cache');
					let amount_cleaned = 0;
					if (meta_cache && typeof meta_cache === 'object' && Object.keys(meta_cache).length>0) {
						for (let x in meta_cache) {
							if (this.array_intersect(meta_cache[x].x_ids.split(','),changed_x_cmds).length>0) {
								//remove page 'hashkey' from cache
								this.x_console.outT({ prefix:'cache,yellow', message:`removing ${x} file info from cache ..`, color:'dim' });
								await this.cache.removeItem(meta_cache[x].cachekey);
								await this.cache.removeItem(meta_cache[x].cachekey+'_x_state');
								amount_cleaned+=1;
							}
						}
					}
					//sleep a little depending on how much was cleaned...
					let sleep=function(ms) {
						return new Promise(resolve => setTimeout(resolve, ms));
					}
					await this.cleanAutocompleteFiles(); //erase autocomplete files
					await sleep(5*amount_cleaned);
					//
				}
			} else {
				// if cached_hashses doesn't exist, clean everything from cache (should be first upgrade)
				this.x_console.outT({ prefix:'cache,yellow', message:`x_commands has changed hash! cleaning all previous cache`, color:'yellow' });
				await this.cache.clear();
				await this.cleanAutocompleteFiles(); //erase autocomplete files
			}
			//set new comparision to cache
			await this.cache.setItem('watched_vars',watched_vars);	
			await this.cache.setItem('watched_vars_hash_now',watched_vars_hash_now);	
			await this.cache.setItem('commands_hash',commands_hash);
			await this.cache.setItem('commands_hashes',x_cmds_hashes);
		}
	}

	/**
	* Finds one or more commands defined that matches the specs of the given node.
	* @async
	* @param 	{NodeDSL}		node			- node for which to find commands that match
	* @param 	{boolean}		[justone=true]	- indicates if you want just the first match (true), or all commands that match the given node (false)
	* @return 	{Command|Command[]}
	*/
	async findCommand({node=this.throwIfMissing('node'),justone=true, show_debug=true}={}) {
		if (!this.x_flags.init_ok) throw new Error('error! the first called method must be init()!');
		let resp = {...this.reply_template(),...{ id:'not_found', hint:'failover command'}}, xtest = [];
		if (typeof node.icons === 'undefined') {
			if (show_debug) this.debug('error: findCommand was given a blank node!');
			return resp;
		}
		let cache_key = node.id+node.date_modified.toString() //+node.nodes_raw.toString();
		let t_cache = await this.cache.getItem(cache_key);
		if (t_cache && ((Array.isArray(t_cache) && t_cache.length>0) || t_cache.data)) { // node.id in this.x_memory_cache.findCommand
			if (show_debug) this.debug(`using memory_cache for findCommand for node ID ${node.id}`);
			return t_cache;
		} else {
			if (show_debug) this.debug(`findCommand for node ID ${node.id}`);
			let keys = 'x_icons,x_not_icons,x_not_empty,x_not_text_contains,x_empty,x_text_exact,x_text_contains,x_text_pattern,x_level,x_or_hasparent,x_all_hasparent,x_or_isparent';
			let command_requires1 = setObjectKeys(keys,'');
			let node_features = {...command_requires1}; 
			let command_defaults = {...command_requires1};
			let def_matched = setObjectKeys(keys,true), comm;
			delete this.x_commands['constructor']; //4-jun-21 @todo double check this; maybe we should use a cloned var
			// iterate through commands
			for (let key in this.x_commands) {
				//let comm_keys = Object.keys(this.x_commands[key]);
				// reset defaults for current command
				let matched = {...def_matched};
				// build template for used keys
				let command_requires = {...command_defaults,...this.x_commands[key]};
				delete command_requires.func;
				// test command features vs node features
				// test 1: icon match
				
				//if (this.x_config.debug) this.x_console.time({ id:`${key} x_icons` });
				if (command_requires['x_icons']!='') {
					this.debug_time({ id:`${key} x_icons` });
					for (let qi of command_requires.x_icons.split(',')) {
						matched.x_icons = (node.icons.includes(qi))?true:false;
						if (!matched.x_icons) break;
						await setImmediatePromise();
					}
					this.debug_timeEnd({ id:`${key} x_icons` });
				}			
				//if (this.x_config.debug) this.x_console.timeEnd({ id:`${key} x_icons` });
				// test 2: x_not_icons
				if (command_requires['x_not_icons']!='' && allTrue(matched,keys)) {
					this.debug_time({ id:`${key} x_not_icons` });
					// special case first
					if (node.icons.length>0 && command_requires['x_not_icons']!='' && ['*'].includes(command_requires['x_not_icons'])) {
						matched.x_not_icons = false;
					} else if (command_requires['x_not_icons']!='') {
						// if node has any icons of the x_not_icons, return false aka intersect values, and if any assign false.
						matched.x_not_icons = (this.array_intersect(command_requires['x_not_icons'].split(','), node.icons).length>0)?false:true;
					}
					this.debug_timeEnd({ id:`${key} x_not_icons` });
				}
				// test 3: x_not_empty. example: attributes[event,name] aka key[value1||value2] in node
				// supports multiple requirements using + as delimiter "attributes[event,name]+color"
				if (command_requires['x_not_empty']!='' && allTrue(matched,keys)) {
					this.debug_time({ id:`${key} x_not_empty` });
					//this.debug(`test x_not_empty: ${command_requires['x_not_empty']}`);
					// transform x_not_empty value => ex. attributes[event,name]+color => attributes[event+name],color in com_reqs
					let com_reqs=command_requires['x_not_empty'].replace(/\+/g,'/').replace(/\,/g,'+').replace(/\//g,',').split(',');
					//this.debug(':transformed x_not_empty',com_reqs.join(','));
					for(let test of com_reqs) {
						// start tests
						if(test.indexOf('.')!=-1) {
							// struct type definition: ex. cloud.bgcolor (if exists, it must not be empty, or false if doesnt exist)
							let testpath = getVal(node,test);
							if (typeof testpath === 'string' && testpath=='' ||
								typeof testpath === 'boolean' && testpath==false) {
								matched.x_not_empty=false;
								break;
							}
						} else if (test.indexOf('[')!=-1) {
							// array type definition: ex. attributes[value1,value2..] (attributes is an array type)
							// it must exist value1,value2,.. within array attributes of objects to be true
							let array_key = test.split('[')[0];
							let keys = this.dsl_parser.findVariables({ text:test, symbol:'[', symbol_closing:']' }).split('+');
							let has_keys = [];
							if (array_key!='attributes' && node[array_key]) {
								for(let obj of node[array_key]) {
									Object.keys(obj).filter(function(x) {
										has_keys.push(x)
									});
								}
							} else if (array_key=='attributes') {
								Object.keys(node.attributes).filter(function(x) {
									has_keys.push(x)
								});
							}
							if (this.array_intersect(has_keys,keys).length!=keys.length) {
								matched.x_not_empty=false;
							}
						} else {
							// single attribute
							if (test in node && typeof node[test] === 'string' && node[test]=='') {
								matched.x_not_empty=false;
							} else if (test in node && typeof node[test] === 'boolean' && node[test]==false) {
								matched.x_not_empty=false;
							} else if (typeof node[test] === 'undefined') {
								matched.x_not_empty=false;
							}
						}
						await setImmediatePromise();
					}
					this.debug_timeEnd({ id:`${key} x_not_empty` });
				}
				// test 4: x_not_text_contains
				// can have multiple values.. ex: margen,arriba
				if (command_requires['x_not_text_contains']!='' && allTrue(matched,keys)) {
					this.debug_time({ id:`${key} x_not_text_contains` });
					for (let word of command_requires['x_not_text_contains'].split(',')) {
						if (node.text.indexOf(word)!=-1) {
							matched.x_not_text_contains=false;
							break;
						}
						await setImmediatePromise();
					}
					this.debug_timeEnd({ id:`${key} x_not_text_contains` });
				}
				// test 5: x_empty (node keys that must be empty (undefined also means not empty))
				if (command_requires['x_empty']!='' && allTrue(matched,keys)) {
					this.debug_time({ id:`${key} x_empty` });
					for (let key of command_requires['x_empty'].split(',')) {
						let testpath = getVal(node,key);
						if (typeof testpath === 'string' && testpath!='') {
							matched.x_empty=false;
							break;
						} else if (typeof testpath === 'object' && testpath.length>0) {
							matched.x_empty=false;
							break;
						} else if (typeof testpath === 'undefined') {
							matched.x_empty=false;
							break;
						}
						await setImmediatePromise();
					}
					this.debug_timeEnd({ id:`${key} x_empty` });
				}
				// test 6: x_text_exact
				if (allTrue(matched,keys) && command_requires['x_text_exact']!='') {
					this.debug_time({ id:`${key} x_text_exact` });
					matched.x_text_exact = (command_requires['x_text_exact']==node.text)?true:false;
					this.debug_timeEnd({ id:`${key} x_text_exact` });
				}
				// test 7: x_text_contains
				if (allTrue(matched,keys) && command_requires['x_text_contains']!='') {
					this.debug_time({ id:`${key} x_text_contains` });
					// @TODO here we are
					if (command_requires['x_text_contains'].indexOf('|')!=-1) {
						// 'or' delimiter
						let n_match=false;
						for (let key of command_requires['x_text_contains'].split('|')) {
							if (node.text.indexOf(key)!=-1) {
								n_match=true;
								break;
							}
						}
						matched.x_text_contains=n_match;

					} else if (command_requires['x_text_contains'].indexOf(',')!=-1) {
						// 'and' delimiter
						for (let key of command_requires['x_text_contains'].split(',')) {
							if (node.text.indexOf(key)==-1 || (key=='' && node.text.indexOf(',')==-1)) { //test if empty for case where coma is required
								matched.x_text_contains=false;
								break;
							}
						}
					} else if (node.text.toLowerCase().indexOf(command_requires['x_text_contains'].toLowerCase())==-1) {
						matched.x_text_contains=false;
					}
					this.debug_timeEnd({ id:`${key} x_text_contains` });
				}
				// test 8: x_level - example: '2,3,4' (any) or '>2,<7' (all)
				if (command_requires['x_level']!='' && allTrue(matched,keys)) {
					this.debug_time({ id:`${key} x_level` });
					matched.x_level=numberInCondition(node.level,command_requires['x_level']);	
					//console.log('x_level DEBUG:',{matched, node, command_requires});
					this.debug_timeEnd({ id:`${key} x_level` });
				}
				// test 9: x_or_hasparent
				if (command_requires['x_or_hasparent']!='' && allTrue(matched,keys)) {
					this.debug_time({ id:`${key} x_or_hasparent` });
					//matched.x_or_hasparent=false;
					matched.x_or_hasparent = await this.hasParentID(node.id,command_requires['x_or_hasparent']);
					this.debug_timeEnd({ id:`${key} x_or_hasparent` });
				}
				// test 10: x_all_hasparent
				if (command_requires['x_all_hasparent']!='' && allTrue(matched,keys)) {
					this.debug_time({ id:`${key} x_all_hasparent` });
					matched.x_all_hasparent = await this.hasParentID(node.id,command_requires['x_all_hasparent'],true);
					this.debug_timeEnd({ id:`${key} x_all_hasparent` });
				}
				
				// test 11: x_or_isparent
				if (command_requires['x_or_isparent']!='' && allTrue(matched,keys)) {
					this.debug_time({ id:`${key} x_or_isparent` });
					let is_direct=false;
					for (let key of command_requires['x_or_isparent'].split(',')) {
						is_direct = await this.isExactParentID(node.id,key);
						if (is_direct==true) break;
						await setImmediatePromise();
					}
					matched.x_or_isparent=is_direct;
					this.debug_timeEnd({ id:`${key} x_or_isparent` });
				}
				
				// test 12: x_text_pattern
				// example: ejecutar en "*" +(segundos|minutos|horas)
				if (typeof command_requires['x_text_pattern'] === 'string' && command_requires['x_text_pattern']!='' && allTrue(matched,keys)) {
					this.debug_time({ id:`${key} x_text_pattern` });
					matched.x_text_pattern = this.x_match(node.text.trim(),command_requires['x_text_pattern']);
					this.debug_timeEnd({ id:`${key} x_text_pattern` });
				}
				// test 12b: x_text_pattern as array of strings
				// any must match
				if (Array.isArray(command_requires['x_text_pattern']) == true && command_requires['x_text_pattern'].length>0 && allTrue(matched,keys)) {
					this.debug_time({ id:`${key} x_text_pattern[]` });
					let test = false, text_trim=node.text.trim();
					for (let xtp of command_requires['x_text_pattern']) {
						test = this.x_match(text_trim,xtp);
						if (test==true) break;
					}
					matched.x_text_pattern = test;
					this.debug_timeEnd({ id:`${key} x_text_pattern[]` });
				}
				// ***************************
				// if we passed all tests ... 
				// ***************************
				if (allTrue(matched,keys)) {
					// count num of defined requires on matched command (more is more exact match, aka priority)
					let count = Object.entries(command_requires).reduce((n, x) => n + (x[1] != ''), 0);
					// assign resp
					resp = {...{x_priority:-1},...this.x_commands[key],...{x_id:key, priority:count}};
					if (!justone) {
						xtest.push(resp);
					} else {
						break;
					}
				}
				/*
				if (node.id=='ID_160079449') {
					console.log(`${node.text}: ${key} command_requires`,command_requires);
					console.log(`${node.text}: matched`,matched);
					console.log(`${node.text}: node/keys`,{node,keys});
				}*/
				await setImmediatePromise();
			}
			// sort by priority
			if (show_debug) this.debug_time({ id:`sorting by priority` });
			let sorted = xtest.sort(function(a,b) {
				if (a.x_priority!=-1 && b.x_priority!=-1) {
					// sort by x_priority
					return b.x_priority-a.x_priority;
				} else {
					// sort by priority (number of features)
					return b.priority-a.priority;
				}
			});
			if (show_debug) this.debug_timeEnd({ id:`sorting by priority` });
			// reply
			if (!justone) {
				/*
				// get just the ids
				let sorted_ids = sorted.map(function(elem,value) {
					return elem.id;	
				});
				*/
				// return the array of commands, sorted by 'priority' key
				resp=sorted;
			}
			//console.log(`findCommand resp`,resp);
			if ((Array.isArray(resp) && resp.length>0) || resp.data) {
				//only add to cache, if at least 1 command was found.
				await this.cache.setItem(cache_key,resp);
			}
			//this.x_memory_cache.findCommand[node.id] = resp;
			return resp;
		}
	}

	/**
	* Signals an abort event for the processing methods.
	*
	* @async
	* @return 	{Command|boolean}
	*/

	async abortProcessing() {
		this.abort=true;
		return true;
	};
	
	/**
	* Finds the valid/best command match for the given node.
	* Also tests the command for its 'valid' attribute, in case the command func specified aditional conditions.
	* If no command is found, returns false.
	*
	* @async
	* @param 	{NodeDSL}		node			- node for which to find the command
	* @param 	{boolean}		[object=false]	- if false returns the command reference, true returns the command execution answer
	* @return 	{Command|boolean}
	*/

	async findValidCommand({node=this.throwIfMissing('node'),object=false,x_command_shared_state={},show_debug=true}={}) {
		if (!this.x_flags.init_ok) throw new Error('error! the first called method must be init()!');
		if (node.id in this.x_memory_cache.findValidCommand) {
			//if (show_debug) this.debug({ message:`findValidCommand called for node ${node.id}, level:${node.level}, text:${node.text} using CACHE`, color:'green' });
			return this.x_memory_cache.findValidCommand[node.id];
		} else {
			if (show_debug) this.debug({ message:`findValidCommand called for node ${node.id}, level:${node.level}, text:${node.text}`, color:'yellow' });
			let reply={};
			//this.debug('findValidCommand, before findCommand for node '+node.id);
			let commands_ = await this.findCommand({node,justone:false,show_debug:show_debug});
			//this.debug('findValidCommand, after findCommand for node '+node.id);
			// @TODO debug and test
			if (commands_.length==0) {
				this.debug({ message:'findValidCommand: no command found.', color:'red' });
				reply.error=true;
				reply.catch='no command found';
			} else if (commands_.length==1 && commands_[0].x_id!='constructor') {
				reply = {...commands_[0]};
				// try executing the node on the found commands_
				try {
					//if (object==true) {
					let test = await this.x_commands[reply.x_id].func(node,x_command_shared_state);
					reply.exec = test;
					//}
					// @TODO test if _f4e is used; because its ugly
					reply._f4e = commands_[0].x_id;
					if (show_debug) this.debug({ message:`findValidCommand: 1/1 applying command ${commands_[0].x_id} ... VALID MATCH FOUND! (nodeid:${node.id})`, color:'green' });
				} catch(test_err) {
					if (show_debug) this.debug({ message:`findValidCommand: 1/1 applying command ${commands_[0].x_id} ... ERROR! (nodeid:${node.id})`, color:'brightRed' });
					await this.showLineError(test_err);
					// @TODO emit('internal_error','findValidCommand')
					reply.error = true;
					reply.valid = false;
					reply.catch = test_err;
					//throw new Error(`executing ${reply.x_id}:`+test_err); // @TODO we should throw an error, so our parents catch it (9-AGO-20)
				}
			} else {
				// more than one command found
				if (show_debug) this.debug({ message:`findValidCommand: ${commands_.length} commands found: (nodeid:${node.id})`, color:'green' });
				// test each command
				for (let qm_index in commands_) {
					let qm = commands_[qm_index];
					if (this.x_commands[qm.x_id]) {
						try {
							let test = await this.x_commands[qm.x_id].func(node,x_command_shared_state);
							if (test && test.valid && test.valid==true) {
								if (show_debug) this.debug({ message:`findValidCommand: ${parseInt(qm_index)+1}/${commands_.length} testing command ${qm.x_id} ... VALID MATCH FOUND! (nodeid:${node.id})`, color:'green' });
								if (show_debug) this.debug({ message:'---------------------', time:false });
								if (object) {//==true) { -this needs further testing 27abr21
									reply=test;
								} else {
									// @TODO test if _f4e is used; because its ugly
									reply=qm;
									reply.exec=test;
									reply._f4e=qm.x_id;
								}
								break;
							}
						} catch(test_err1) {
							if (show_debug) this.debug({ message:`findValidCommand: error executing command ${qm} (nodeid:${node.id})`, color:'red' });
							await this.showLineError(test_err1);
							reply.error = true;
							reply.valid = false;
							reply.catch = test_err1;
							// @TODO we should throw an error, so our parents catch it (9-AGO-20) and break the loop
						}
					}
					await setImmediatePromise();
				}
			}
			if (Object.keys(reply).length==0) reply=false;
			this.x_memory_cache.findValidCommand[node.id] = reply;
			return reply;
		}
	}

	// ****************************
	// ADVANCED PROCESSING METHODS
	// ****************************
	
	/**
	* This method traverses the dsl parsed tree, finds/execute x_commands and generated code as files.
	* @return 	{Object}
	*/
	async process() {
		await this.cacheCommands();
		if (!this.x_flags.init_ok) throw new Error('error! the first called method must be init()!');
		this.debug_time({ id:'process/writer' }); let tmp = {}, resp = { nodes:[] };
		// read nodes
		this.x_console.outT({ prefix:'process,yellow', message:`processing nodes ..`, color:'cyan' });
		let x_dsl_nodes = await this.dsl_parser.getNodes({ level:2, nodes_raw:true, hash_content:true });
		// add abort support
		this.abort = false;
		this.debug('calling prepareCommandsAutocomplete');
		this.debug_time({ id:'prepareAC' });
		await this.prepareCommandsAutocomplete();
		this.debug_timeEnd({ id:'prepareAC' });
		this.debug('calling onPrepare');
		this.debug_time({ id:'onPrepare' });
		await this.onPrepare();
		this.debug_timeEnd({ id:'onPrepare' });
		if (!this.x_config.debug && !this.x_config.silent) { 
			this.progress_multi = {};
			this.multibar = this.x_console.progress({
				format: `{text} {bar} | {screen}`,
				config: { barsize:20, etaBuffer:500, fps:20 }, 
				formatData:(data)=>{
					//color the progress bar
					if (typeof data.error === 'undefined') data.error=false;
					if (data.error && data.error==true) {
						data.bar = data.funcs.colors.brightRed(data.bar);
						data.text = data.funcs.colors.brightRed('processing error'); //+' '+data.funcs.symbols.fail;
						if (data.screen) data.screen = data.funcs.colors.brightRed(data.screen);
						return data;
					} else if (data.percentage<=20) {
						data.bar = data.funcs.colors.magenta(data.bar);
					} else if (data.percentage<=60) {
						data.bar = data.funcs.colors.yellow(data.bar);
					} else {
						data.bar = data.funcs.colors.green(data.bar);
					}
					if (data.screen) data.screen = data.funcs.colors.cyan(data.screen);
					if (data.total_ && data.total_=='x') {
						if (data.percentage>=100) {
							let took = data.funcs.colors.dim(' - {duration}');
							data._format = '{text}'+took; // | {screen}
							data.text = data.funcs.colors.green('processing complete! ')+data.funcs.symbols.success;
						} else {
							data._format = '{text} {bar} | {screen} ({eta} remaining)';
							data.text = data.funcs.colors.dim('overall progress');
						}
					} else {
						if (data.sub && data.sub!='') {
							data.sub = data.funcs.colors.dim(data.sub);
							data.percentage = data.funcs.colors.dim(data.percentage+' %');
							data._format = '{text} {bar} | {screen} -> {sub} {percentage}';
						}
						if (data.percentage>=100) {
							let took = data.funcs.colors.dim(' - {duration}');
							data._format = '{text} | {screen}'+took;
							data.text = 'processing done! '+data.funcs.symbols.success;
						} else {
							data.text = data.funcs.colors.dim('processing');
						}
					}
					return data;
				}
			});
			// 
			this.progress_multi['_total_'] = this.multibar.create(x_dsl_nodes.length-1, { total_:'x', screen:'initializing..' });
		}
		let counter_=0;
		let meta_cache={};
		let meta_cache_ = await this.cache.getItem('meta_cache');
		if (meta_cache_) meta_cache = meta_cache_;
		let obj_diff = require('deep-object-diff').diff;
		let deep = require('deepmerge');
		for (let level2 of x_dsl_nodes) {
			//this.debug('node',level2);
			//break;
			if (!this.x_config.debug && !this.x_config.silent) { 
				if (this.progress_last) this.progress_last.raw().stop();
				this.progress_multi[level2.text] = this.multibar.create(level2.nodes_raw.length-1, { total_:'', screen:'initializing..', error:false });
				this.progress_multi['_total_'].update(counter_, { total_:'x', screen:level2.text, error:false });
				this.progress_last = this.progress_multi[level2.text];
				this.progress_last_screen = level2.text;
			}
			if (this.abort && !this.x_config.debug && !this.x_config.silent) {
				this.progress_multi[level2.text].raw().stop();
				break; //abort processing if request
			} else if (this.abort) {
				break; //abort processing if request
			}
			//cache: check if current node has any children that were modified since last time
			let main = await this.cache.getItem(level2.hash_content);
			// remove await when in production (use Promise.all after loop then)
			if (!main) {
				let before_state = JSON.parse(JSON.stringify(this.x_state));
				main = await this.process_main(level2,{});
				let state_to_save = obj_diff(before_state,this.x_state);
				//console.log('state_to_save',{ state_to_save });
				if (main.error && main.error==true) {
					//don't add main to cache if there was an error processing its inside.
					resp.nodes.push(main);
					break;
				} else {
					//meta info for controlling cache
					meta_cache[main.file] = { cachekey:level2.hash_content, x_ids:main.x_ids };
					await this.cache.setItem(level2.hash_content,main);
					await this.cache.setItem(level2.hash_content+'_x_state',state_to_save);
				}
				//console.log('metido al cache:'+level2.id,main);
			} else {
				let cached_state = await this.cache.getItem(level2.hash_content+'_x_state');
				this.x_state = deep.all([this.x_state, cached_state]);
				if (main.error && main.error==true) {
					await this.cache.removeItem(level2.hash_content);
					//reprocess the removed failed cached node.
					let before_state = JSON.parse(JSON.stringify(this.x_state)); 
					main = await this.process_main(level2,{});
					let state_to_save = obj_diff(before_state,this.x_state);
					//console.log('state_to_save2',{ state_to_save });
					if (main.error && main.error==true) {
					} else {
						//meta info for controlling cache
						meta_cache[main.file] = { cachekey:level2.hash_content, x_ids:main.x_ids };
						await this.cache.setItem(level2.hash_content,main);
						await this.cache.setItem(level2.hash_content+'_x_state',state_to_save);
					}	
				}
				//console.log(level2.id,main);
			}
			//
			if (!this.x_config.debug && !this.x_config.silent) {
				if (main.error && main.error==true) {
					//this.progress_multi['_total_'].update(counter_, { screen:'ERROR', error:true });
					//break;
					this.progress_multi[level2.text].raw().stop();
				} else {
					this.progress_multi[level2.text].total(level2.nodes_raw.length-1);
					this.progress_multi[level2.text].update(level2.nodes_raw.length-1, { screen:level2.text, sub:'', total_:'' });	
				}
			}
			// append to resp
			resp.nodes.push(main);
			await setImmediatePromise();
			counter_+=1;
		}
		if (!this.x_config.debug && !this.x_config.silent) {
			this.progress_multi['_total_'].raw().stop(); //.remove();
			this.multibar.stop();
		}
		// @TODO enable when not debugging
		//resp.nodes = await Promise.all(resp.nodes);
		this.debug_timeEnd({ id:'process/writer' });
		// check if there was some error
		let were_errors = false, errs=[];
		resp.nodes.map(function(x) {
			if (x.error==true) {
				were_errors=true;
				errs.push(x);
				return false;
			}
		});
		// generate autocomplete files
		await this.generateAutocompleteFiles();
		// if there was no error
		if (!were_errors && !this.abort) {
			// request creation of files
			await this.onCreateFiles(resp.nodes);
			this.x_console.title({ title:`Interpreter ${this.x_config.class.toUpperCase()} ENDED. Full Compilation took: ${this.secsPassed_()}`, color:'green' });
			this.debug_table('Amount of Time Per Command');
		} else if (this.abort) {
			this.x_console.title({ title:`Interpreter ${this.x_config.class.toUpperCase()} ABORTED. Partial Compilation took: ${this.secsPassed_()}`, color:'green' });

		} else {
			// errors occurred
			this.x_console.title({ title:`Interpreter ${this.x_config.class.toUpperCase()} ENDED with ERRORS.\nPlease check your console history.\nCompilation took: ${this.secsPassed_()}`, titleColor:'brightRed', color:'red' });	
			//await this.onErrors(errs);
			//this.debug_table('Amount of Time Per Command');
		}
		// some debug
		//this.debug('after nodes processing, resp says:',resp);
		//this.debug('app state says:',this.x_state);
		await this.cache.setItem('last_compile_date',new Date());
		//add meta cache to cache
		await this.cache.setItem('meta_cache',meta_cache);
		await this.onEnd();
		return resp;
	}

	// process helper methods 

	// improved in my imagination ...
	async sub_process(source_resp,nodei,custom_state) {
		let resp = {...source_resp};
		if (resp.hasChildren==true && resp.valid==true && nodei.getNodes) {
			let sub_nodes;
			try {
				sub_nodes = await nodei.getNodes();
			} catch(errrr) {
				console.log('node que falla con getNodes()',nodei);
			}
			let new_state = {}, xx=0;
			if (nodei.state) new_state = {...nodei.state};
			new_state = {...new_state,...custom_state};
			if (!this.x_config.debug && !this.x_config.silent) {
				this.progress_last.total(sub_nodes.length-1);
				//this.progress_multi['_total_'].raw().updateETA();
			}
			for (let sublevel of sub_nodes) {
				xx+=1;
				//this.debug('sub_process before getNode sublevel.id:'+sublevel.id);
				let real = await this.dsl_parser.getNode({ id:sublevel.id, nodes_raw:true, recurse:false });
				//this.debug('sub_process before findValidCommand node id:'+real.id);
				let real2 = await this.findValidCommand({ node:real, object:false, x_command_shared_state:new_state });
				if (!this.x_config.debug && !this.x_config.silent) {
					this.progress_last.update(xx, { screen:this.progress_last_screen, sub:real2.x_id, total_:'' });
				}
				//this.debug('sub_process after findValidCommand');
				//console.log('sub_process->findValidCommand node:'+real.text,real2);
				//if (nodei.state) new_state = {...new_state, ...nodei.state, ...real2.state}; // inherint state from last command if defined
				if (real2.state) new_state = {...new_state, ...real2.state}; // inherint state from last command if defined
				if (real2 && real2.exec && real2.exec.valid==true) {
					//resp.children.push(real2.exec);
					if (real2.exec.state) new_state = {...new_state,...real2.exec.state};
					//console.log('real2 dice:',real2);
					resp.init += real2.exec.init;
					resp.code += real2.exec.open;
					if (!resp.x_ids) resp.x_ids=[]; resp.x_ids.push(real2.x_id);
					//this.debug('sub_process before new sub_process sublevel id:'+sublevel.id);
					resp = await this.sub_process(resp,sublevel,new_state);
					resp.code += real2.exec.close;
				} else if (real2.error==true) {
					if (!this.x_config.debug && !this.x_config.silent) {
						this.progress_last.total(xx);
						this.progress_last.update(xx, { screen:this.progress_last_screen, error:true });
					}
					this.x_console.outT({ message:`error: Executing func x_command:${real2.x_id} for node: id:${real.id}, level ${real.level}, text: ${real.text}.`, data:{ id:real.id, level:real.level, text:real.text, data:real2.catch, x_command_state:new_state }});
					await this.onErrors([`Error executing func for x_command:${real2.x_id} for node id ${real.id}, text: ${real.text} `]);
					resp.valid=false, resp.hasChildren=false, resp.error=true;
					break;
				}
				await setImmediatePromise();
			}
		}
		return resp;
	}

	async showLineError(error) {
		let error_info = { line:-1, col:-1, message:error.toString() };
		let raw_tmp = error.stack;
		let print_code = require('print-code');
		if (typeof raw_tmp == 'string' && raw_tmp.includes('commands.js')) {
			let extract = require('extractjs')();
			let elements = extract(`at {path}commands.js:{line}:{col}\n`,raw_tmp);
			if (elements.path && elements.path.includes(' (')) {
				elements = extract(` ({path}commands.js:{line}:{col}\n`,raw_tmp);
			}
			//console.log('Pablo debug - showLine elements',elements);
			error_info.file = (elements.path)?elements.path:'';
			error_info.file += 'commands.js';
			error_info.line = elements.line;
			try {
				error_info.col = elements.col.replace(')','');
			} catch(xttt) {
				//console.log('error with col',{raw_tmp,error_info});
			}
		}
		if (error_info.file && (await this.exists(error_info.file))==true) {
			let fs = require('fs').promises;
			let colors = require('colors/safe');
			//try {
				let cmds_code = await fs.readFile(error_info.file,'utf-8');
				let toshow = print_code(cmds_code)
								.highlight(error_info.line,error_info.line)
								.slice(error_info.line-3,error_info.line+4)
								.max_columns(200)
								.arrow_mark(error_info.line,error_info.col)
								.get();
				this.x_console.out({ message:'An error ocurred on file:', color:'red' });
				this.x_console.out({ message:error_info.file, color:'brightCyan' });
				this.x_console.out({ message:error_info.message, color:'brightYellow' });
				console.log(colors.bgBlack(colors.yellow((toshow))));
				//this.x_console.out({ message:'\n \n'+toshow, color:'dim' });
			//}
		} else {
			console.log('referenced file with error not found',raw_tmp);
		}
		//
	}

	async process_main(node,custom_state) {
		let resp={ 
			state:custom_state,
			id: node.id,
			name: await this.onDefineNodeName(node),
			file: await this.onDefineFilename(node),
			init: '',
			title: await this.onDefineTitle(node),
			attributes: node.attributes,
			code: '',
			open: '',
			close: '', 
			x_ids: [],
			subnodes: node.nodes_raw.length
		};
		if (this.x_config.debug && !this.x_config.silent) {
			this.x_console.outT({ prefix:'process,yellow', message:`processing node ${node.text} ..`, color:'yellow' });
		}
		//
		//try {
			//console.log('process_main->findValidCommand node:'+node.text);
			let copy_state = {...custom_state};
			let test = await this.findValidCommand({ node:node,object:false,x_command_shared_state:copy_state });
			//this.debug(`test para node: text:${node.text}`,test);
			if (test && test.exec && test.exec.valid==true) {
				if (test.exec.state) copy_state = {...copy_state,...test.exec.state};
				resp = {...resp,...test.exec};
				resp.error = false;
				resp.init += resp.init;
				resp.code += resp.open;
				resp.state = copy_state;
				if (!resp.x_ids) resp.x_ids=[]; resp.x_ids.push(test.x_id);
				if (typeof node.getNodes === 'function') {
					resp = await this.sub_process(resp,node,copy_state);
				}
				resp.code += resp.close;
				resp.x_ids = resp.x_ids.join(',');
			} else if (test.error==true) {
				this.x_console.outT({ message:`node text: ${node.text}`, color:'red' });
				//this.x_console.outT({ message:`error: Executing func x_command:${test.x_id} for node: id:${node.id}, level ${node.level}, text: ${node.text}.`, data:{ id:node.id, level:node.level, text:node.text, catch:test.catch, x_command_state:test.state }});
				await this.onErrors([`Error executing func for x_command:${test.x_id} for node id ${node.id}, text: ${node.text} `]);
				if (!this.x_config.debug && !this.x_config.silent) {
					this.progress_last.total(2);
					this.progress_last.update(1, { screen:this.progress_last_screen+'\n', error:true });
				}
				// improved error logging
				await this.showLineError(test.catch);
				resp.valid=false, resp.hasChildren=false, resp.error=true;
			} else {
				this.x_console.outT({ message:'error: FATAL, no method found for node processing.', data:{ id:node.id, level:node.level, text:node.text } });
				await this.onErrors([`No method found for given node id ${node.id}, text: ${node.text} `]);
				resp.valid=false, resp.hasChildren=false, resp.error=true;
			}
			// closing level2 'on' calls
			resp = await this.onAfterProcess(resp);
			resp = await this.onCompleteCodeTemplate(resp);
			//
		/*} catch(err) {
			// @TODO currently findValidCommand doesn't throw an error when an error is found.
			this.x_console.outT({ message:`error: Executing func x_command for node: id:${node.id}, level ${node.level}, text: ${node.text}.`, data:{ id:node.id, level:node.level, text:node.text, error:err }});
			await this.onErrors([`Error executing func for x_command for node id ${node.id}, text: ${node.text} `]);
			resp.valid=false, resp.hasChildren=false, resp.error=true;
		}*/
		// return
		return resp;
	}

	// **********************
	// public helper methods
	// **********************

	secsPassed_() {
		let tmp = new Date().getTime() - this.x_flags.watchdog.start.getTime();
		let humanize = require('humanize-duration');
		return humanize(tmp,{ maxDecimalPoints: 0 }); //tmp/1000
	}

	throwIfMissing(name) {
        throw new Error('Missing '+name+' parameter!');
    }

    /**
	* Helper method for obtaining the common values (which can be anything) between two arrays.
	* @param 	{string[]|Object[]|boolean[]}		arr1	- first array
	* @param 	{string[]|Object[]|boolean[]}		arr2	- second array
	* @return 	{string[]|Object[]|boolean[]}
	*/
    array_intersect(arr1,arr2) {
    	return arr1.filter(x => arr2.includes(x));
    }

    /**
	* Helper method for obtaining the first array items minus the second array items (which can be anything).
	* @param 	{string[]|Object[]|boolean[]}		arr1	- first array from which to substract
	* @param 	{string[]|Object[]|boolean[]}		arr2	- second array with items to substract from arr1
	* @return 	{string[]|Object[]|boolean[]}
	*/
    array_substract(arr1,arr2) {
    	return arr1.filter(x => !arr2.includes(x));
    }

    /**
	* Helper method for obtaining the unique values (which can be anything) between two arrays.
	* @param 	{string[]|Object[]|boolean[]}		arr1	- first array
	* @param 	{string[]|Object[]|boolean[]}		arr2	- second array
	* @return 	{string[]|Object[]|boolean[]}
	*/
    array_difference(arr1,arr2) {
    	return arr1
                 .filter(x => !arr2.includes(x))
                 .concat(arr2.filter(x => !arr1.includes(x)));
    }

    /**
	* Helper method for joining the values (which can be anything) between two arrays.
	* @param 	{string[]|Object[]|boolean[]}		arr1	- first array
	* @param 	{string[]|Object[]|boolean[]}		arr2	- second array
	* @return 	{string[]|Object[]|boolean[]}
	*/
    array_union(arr1,arr2) {
    	return [...arr1, ...arr2];
    }

    // public helpers
    /**
	* Helper method for defining how to display (or do with them; if you overload it) debug messages.
	* @param 	{string|Object}		message		- message to display. It can also be an Object of open-console params.
	* @param 	{*}					[data]		- data variable to show with message
	*/
    debug(message,data) {
    	let params={};
    	if (arguments.length==1 && typeof arguments[0] === 'object') {
    		params=arguments[0];
    	} else {
    		params={ message, data };
    	}
		if (this.x_config.debug && params.time && !this.x_config.silent) {
			this.x_console.outT({...{ prefix:'debug,dim', color:'dim' },...params});
		} else if (this.x_config.debug && !this.x_config.silent) {
			this.x_console.out({...{ prefix:'debug,dim', color:'dim' },...params});
		}
	}

	/*
	* Creates required app folder structure needed for file generation as the given specs and returns object with absolute paths
	* optional output_dir overwrites base target directory (which is location of .dsl file + apptitle subdir)
	* @param 	{Object} 	keys 			- Object with keys for which to return absolute paths. Each key must contain a relative output directory (can be nested) to be created and returned.
	* @param 	{string} 	[output_dir]	- Overwrites the default output base directory (which is the location of the dsl file being proccessed).
	* @return 	{Object}
	*/
	async _appFolders(keys,compile_folder=this.x_state.central_config.apptitle,output_dir) {
		let fs = require('fs').promises;
		this.debug('_appFolders');
		let path = require('path');
		let dsl_folder = path.dirname(path.resolve(this.x_flags.dsl))+path.sep;
		if (output_dir) dsl_folder=output_dir;
		let resp = { base:dsl_folder, src:dsl_folder+((compile_folder)?compile_folder:this.x_state.central_config.apptitle)+path.sep };
		resp.app = path.normalize(resp.src);
		resp.compile_folder = compile_folder;
		// depending on central config type
		for (let key in keys) {
			resp[key] = path.join(resp.app,keys[key]);
			// create directories as needed
			try {
				await fs.mkdir(resp[key], { recursive:true });
			} catch(errdir) {
			}
		} 
		// return
		return resp;
	}

	/**
	* Helper method for measuring (start) time in ms from this method until debug_timeEnd() method and show it in the console.
	* @param 	{string}		id		- id key (which can also have spaces and/or symbols) with a unique id to identify the stopwatch.
	*/
	debug_time() {
		// instead of marking and showing time, we want in vue to build a time table and show it with another method
		if (arguments.length>0) {
			let keys = {...arguments[0]};
			if (typeof keys.id !== 'undefined' && keys.id.indexOf('def_')!=-1) { //&& keys.id.indexOf('_x')!=-1
				let filter_key = keys.id.split(' ')[0];
				if (typeof this.x_time_stats.times[filter_key] === 'undefined' && filter_key.indexOf('def_')!=-1) {
					this.x_time_stats.times[filter_key] = new Date();
					this.x_time_stats.tables[filter_key] = { command:filter_key, calls:0, average_call:0, total_ms:0 };
				} else if (this.x_config.debug==true && !this.x_config.silent) {
					this.x_console.time({...arguments[0]});	
				}
			} else if (this.x_config.debug==true && !this.x_config.silent) {
				this.x_console.time({...arguments[0]});
			}
		}
	}
	/*
	debug_time() {
		if (this.x_config.debug && arguments.length>0) {
			this.x_console.time({...arguments[0]});
		}
	}*/

	/**
	* Helper to test if a given file exists or not
	* @param {string} 		dir_or_file 	- full directory or file to test
	* @return {boolean}
	*/
	async exists(dir_or_file) {
        let fs = require('fs').promises;
        try {
            await fs.access(dir_or_file);
            return true;
        } catch(e) {
            return false;
        }
    }

	/**
	* Helper method for measuring (end) time in ms from the call of debug_time() method.
	* @param 	{string}		id		- id key used in the call for debug_time() method.
	*/
	debug_timeEnd() {
		if (arguments.length>0) { 
			let keys = {...arguments[0]}, filter_key=''; // && keys.id.indexOf('_x')!=-1
			if (typeof keys.id !== 'undefined') filter_key = keys.id.split(' ')[0];
			if (typeof keys.id !== 'undefined' && filter_key.indexOf('def_')!=-1 && filter_key in this.x_time_stats.times) {
				//if (!this.x_time_stats.tables[keys.id]) this.x_time_stats.tables[keys.id] = {};
				if (typeof this.x_time_stats.tables[filter_key] !== 'undefined') {
					let timePassed = new Date().getTime() - this.x_time_stats.times[filter_key].getTime();
					this.x_time_stats.tables[filter_key].calls += 1;
					this.x_time_stats.tables[filter_key].total_ms = timePassed;
					this.x_time_stats.tables[filter_key].average_call = Math.round(this.x_time_stats.tables[filter_key].total_ms/this.x_time_stats.tables[filter_key].calls);
				}
			} else if (this.x_config.debug==true && !this.x_config.silent) {
				this.x_console.timeEnd({...{ color:'dim',prefix:'debug,dim' },...arguments[0]});
			}
		}
	}
	/*debug_timeEnd() {
		if (this.x_config.debug && arguments.length>0) {
			this.x_console.timeEnd({...{ color:'dim',prefix:'debug,dim' },...arguments[0]});
		}
	}*/

	/**
	* Helper method for showing a table with each command execution time and amount of calls
	* @param 	{string}		title		- Optional custom title for table.
	*/
	debug_table(title) {
		// build a table with x_time_stats and show it on the console
		let table = [];
		try {
			Object.keys(this.x_time_stats.tables).map(function(key) { table.push(this.x_time_stats.tables[key]); }.bind(this));
			this.x_console.table({ title:(title)?title:'Times per Command', data:table, color:'cyan' });
		} catch(e) {
			this.x_console.outT({ message:`used cache for finding every command`, color:'cyan' });
		}
	}

	/**
	* Helper method to return true if given node id has a brother of given command x_id
	* @async
	* @param 	{string}	id		- ID of NodeDSL object to query
	* @param 	{string}	x_id	- Command object x_id to test for
	* @return 	{Boolean}
	*/
	async hasBrotherID(id=this.throwIfMissing('id-brotherID'),x_id=this.throwIfMissing('x_id')) {
		// @TODO test it after having 'real' commands on some parser 3-ago-20
		if ((id+x_id) in this.x_memory_cache.hasBrotherID) {
			return this.x_memory_cache.hasBrotherID[id+x_id];
		} else {
			let brother_ids = await this.dsl_parser.getBrotherNodesIDs({ id, before:true, after:true }).split(',');
			let brother_x_ids = [], resp=false;
			for (let q of brother_ids) {
				let node = await this.dsl_parser.getNode({ id:q, recurse:false });
				let command = await findValidCommand({ node:node, show_debug:false, object:true });
				brother_x_ids.push(command.x_id);
				if (brother_x_ids.includes(x_id)==true) return true;
			}
			//resp = (brother_x_ids.includes(x_id));
			this.x_memory_cache.hasBrotherID[id+x_id] = resp;
			return resp;
		}
	}

	/**
	* Helper method to return true if given node ID has a brother before it
	* @async
	* @param 	{string}	id		- ID of NodeDSL object to query
	* @return 	{Boolean}
	*/
	async hasBrotherBefore(id=this.throwIfMissing('id-brotherBefore')) {
		if (id in this.x_memory_cache.hasBrotherBefore) {
			return this.x_memory_cache.hasBrotherBefore[id];
		} else {
			let brother_ids = await this.dsl_parser.getBrotherNodesIDs({ id, before:true, after:false }).split(',');
			this.x_memory_cache.hasBrotherBefore[id] = brother_ids.includes(id);
			return this.x_memory_cache.hasBrotherBefore[id];
		}
	}

	/**
	* Helper method to return true if given node ID has a brother following it
	* @async
	* @param 	{string}	id		- ID of NodeDSL object to query
	* @return 	{Boolean}
	*/
	async hasBrotherNext(id=this.throwIfMissing('id - BrotherNext')) {
		if (id in this.x_memory_cache.hasBrotherNext) {
			return this.x_memory_cache.hasBrotherNext[id];
		} else {
			let brother_ids = await this.dsl_parser.getBrotherNodesIDs({ id, before:false, after:true }).split(',');
			this.x_memory_cache.hasBrotherNext[id] = brother_ids.includes(id);
			return this.x_memory_cache.hasBrotherNext[id];
		}
	}

	/**
	* Helper method to return true if given Command object x_id is the exact parent for the given NodeDSL object id
	* @async
	* @param 	{string}	id		- ID of NodeDSL object to query
	* @param 	{string}	x_id	- Command object x_id to test for
	* @return 	{Boolean}
	*/
	async isExactParentID(id=this.throwIfMissing('id-ExactParent'),x_id=this.throwIfMissing('x_id')) {
		// @TODO test it after having 'real' commands on some parser 4-ago-20
		if ((id+x_id) in this.x_memory_cache.isExactParentID) {
			return this.x_memory_cache.isExactParentID[id+x_id];
		} else {
			let parent_node = await this.dsl_parser.getParentNode({ id });
			let parent_command = await this.findValidCommand({ node:parent_node, show_debug:false, object:true });
			if (parent_command && parent_command.x_id == x_id) {
				this.x_memory_cache.isExactParentID[id+x_id]=true;
				return true;
			}
			this.x_memory_cache.isExactParentID[id+x_id]=false;
			return false;
		}
	}

	/**
	* Helper method to return true if given Command object x_id is the parent or is an ancestor for the given NodeDSL object id
	* @async
	* @param 	{string}	id		- ID of NodeDSL object to query
	* @param 	{string}	x_id	- Command object x_id to test for
	* @return 	{Boolean}
	*/
	async hasParentID(id=this.throwIfMissing('id-ParentID'),x_id=this.throwIfMissing('x_id'),onlyTrueIfAll=false) {
		// @TODO test it after having 'real' commands on some parser aug-4-20, fixed on aug-15-20
		let x_ids = x_id.split(',');
		let parents = await this.dsl_parser.getParentNodesIDs({ id, array:true });
		let allmatch = true, tested_parents_x_ids=[];
		for (let parent_id of parents) {
			let node = await this.dsl_parser.getNode({ id:parent_id, recurse:false });
			let parentCommand = await this.findValidCommand({ node, show_debug:false, object:true });
			if (onlyTrueIfAll==false && x_ids.includes(parentCommand.x_id)) {
				return true;
			} else if (onlyTrueIfAll==false) {
				//return false;
			} else if (onlyTrueIfAll==true) {
				// onlyTrueIfAll==true
				tested_parents_x_ids.push(parentCommand.x_id);
				if (this.array_intersect(tested_parents_x_ids,x_ids).length==x_ids.length) {
					return true;
				}
			}
		}
		// test again if we are here
		if (this.array_intersect(tested_parents_x_ids,x_ids).length==x_ids.length) {
			return true;
		} else {
			return false;
		}
		//if (!onlyTrueIfAll) return false;
		return allmatch;
	}

	/**
	* Helper method to return all Command object x_ids parents of given NodeDSL id; if array=true, 
	* @async
	* @param 	{string}	id		- ID of NodeDSL object to query
	* @param 	{Boolean}	array	- If true, returns array of objects with x_id and ids, instead of a list of NodeDSL ids.
	* @return 	{string|Object[]}
	*/
	async getParentIDs(id=this.throwIfMissing('id-ParentIDs'), array=false) {
		// @TODO test it after having 'real' commands on some parser 4-ago-20
		let parents = await this.dsl_parser.getParentNodesIDs({ id, array:true });
		let resp = [];
		for (let parent_id of parents) {
			let node = await this.dsl_parser.getNode({ id:parent_id, recurse:false });
			let command = await this.findValidCommand({ node, show_debug:false });
			if (command && array) {
				resp.push({ id:parent_id, x_id:command.x_id });
			} else {
				resp.push(command.x_id);
			}
		}
		if (array && array==true) return resp;
		return resp.join(',');
	}

	/**
	* Helper method to return all Command object x_ids parents of given NodeDSL id as an array (its an alias for getParentIDs) 
	* @async
	* @param 	{string}	id		- ID of NodeDSL object to query
	* @return 	{Object[]}
	*/
	async getParentIDs2Array(id=this.throwIfMissing('id - ParentIDs2Array')) {
		return await this.getParentIDs(id,true);
	}

	// 3-aug-20 PSB doesn't seem to be used anywhere)
	/**
	* Helper method to return all NodeDSL ids parents of given NodeDSL id 
	* @async
	* @param 	{string}	id		- ID of NodeDSL object to query
	* @return 	{Object[]}
	* @deprecated
	*/
	async getParentIDs2ArrayWXID(id=this.throwIfMissing('id - ParentIDs2ArrayWXID')) {
		// this is only used in ti.cfc: def_textonly (just for back-compatibility in case needed);
		// @deprecated 4-ago-2020
		let parents = await this.getParentIDs(id,true);
		return parents.map(x=>{id:x.id}); // just return ids as an array of objects
	}

	/**
	* Helper method to return a tag with key/values as tag attributes
	* @param 	{Object}	struct		- Object with keys and values to transform from.
	* @return 	{string}
	*/
	tagParams(tag='',params={}, selfclose=false) {
		let resp='';
		let x_params = this.struct2params(params);
		if (x_params!='') {
			resp=`<${tag} ${x_params}`;
			if (selfclose==true) resp+='/';
			resp+='>';
		} else {
			resp=`<${tag}`;
			if (selfclose==true) resp+='/';
			resp+='>';
		}
		return resp;
	};

	/**
	* Helper method to transform object keys/values into params for customtags usage
	* @param 	{Object}	struct		- Object with keys and values to transform from.
	* @return 	{string}
	*/
	struct2params(struct=this.throwIfMissing('id - struct2params')) {
		let resp=[];
		for (let [key, value] of Object.entries(struct)) {
			if (typeof value !== 'object' && typeof value !== 'function' && typeof value !== 'undefined') {
				resp.push(`${key}='${value}'`);
			}
		}
		return resp.join(' ');
	}

	cleanIDs4node(node=this.throwIfMissing('node')) {
		let copy = node;
		delete copy.id;
		return copy;
	}

	// CONCEPTO_CLI helper methods
	async returnPromps() {
        const prompts = require('prompts');
        let prompts_ = {
            ask: async(question,validation=null)=>{
                const resp = (
                    await prompts({
                        type: 'text',
                        name: 'value',
                        message: this.x_console.colorize(question),
                        validate: (value) => {
                            if (validation) return validation(value);
                            return true
                        }
                    })
                ).value;
                return resp;
            },
            choose: async(question='', options=[], selected=0) => {
                const resp = (
                    await prompts({
                        type: 'select',
                        name: 'value',
                        message: this.x_console.colorize(question),
                        choices: options,
                        initial: selected
                    })
                ).value;
                return resp;
            },
            multi: async(question='', options=[], max=0, hint=null) => {
                const resp = (
                    await prompts({
                        type: 'multiselect',
                        name: 'value',
                        message: this.x_console.colorize(question),
                        choices: options,
                        max,
                        hint: (hint)?hint:'- Space to select. Return to submit'
                    })
                ).value;
                return resp;
            }
        }
        return prompts_;
    }

}

// private helper methods; not to be exported
function getInstanceMethodNames(obj, stop) {
  let array = [];
  let proto = Object.getPrototypeOf (obj);
  let me = this;
  while (proto && proto !== stop) {
  	console.log('processing proto:',proto);
    Object.getOwnPropertyNames (proto)
      .forEach ((name,pos) => {
        if (name !== 'constructor') {
          if (hasMethod (proto, name)) {
        	array.push ({ name:name, pos:pos, class:proto, params:getParamNames(proto[name]) });
          }
        }
      });
    proto = Object.getPrototypeOf (proto);
    stop = proto; //we only need the first record, not our parents.
  }
  return array;
}

function getParamNames(func) {
	let STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
	let ARGUMENT_NAMES = /([^\s,]+)/g;
	let fnStr = func.toString().replace(STRIP_COMMENTS, '');
	// @TODO 30-jul-20 add support for params of type spread (ex. onlyOnVue2)
	let result = fnStr.slice(fnStr.indexOf('(')+1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
	if(result === null)
	 result = [];
	return result;
}

function hasMethod (obj, name) {
	const desc = Object.getOwnPropertyDescriptor (obj, name);
	return !!desc && typeof desc.value === 'function';
}

//sets/creates the same value to all keys in an object
function setObjectKeys(obj,value) {
	let resp=obj;
	if (typeof resp === 'string') {
		resp = {};
		let keys=obj.split(',');
		for (let i in keys) {
			resp[keys[i]]=value;
		}
	} else {
		for (let i in resp) {
			resp[i]=value;
		}
	}
	return resp;
}

function allTrue(object,keys) {
	//ex. allTrue(matched,'x_icons,x_not_icons');
	let resp = true;
	for (let key of keys.split(',')) {
		if (object[key]!==true) {
			resp = false;
			break;
		}
	}
	return resp;
}

//returns true if num meets the conditions listed on test (false otherwise)
function numberInCondition(num,command_test) {	
	// num is always 'number' type
	let resp=true;
	if (command_test.toString()===num.toString()) {

	} else if (typeof command_test === 'number') {
		// cases test: 2,5,9,1 (exact matches)
		if (num==command_test) {
			resp=true;
		} else if (num!=command_test) {
			resp=false;
		}

	} else if (typeof command_test === 'string') {
		if (command_test.indexOf(',')==-1 && command_test.charAt(0)=='<') {
			// one condition: <2 or <7
			if (num>=parseInt(command_test.replace('<',''))) {
				resp=false;
			}
		} else if (command_test.indexOf(',')==-1 && command_test.charAt(0)=='>') {
			// one condition: >2 or >7
			if (num<=parseInt(command_test.replace('>',''))) {
				resp=false;
			}
		} else if (command_test.indexOf(',')==-1 && command_test!=num.toString()) {
			resp=false;

		} else {
			// cases test:['2','>2','2,3,5']
			let test2 = command_test.split(',');
			if (command_test.indexOf('<')==-1 && command_test.indexOf('>')==-1 && test2.includes(num.toString())) {
				// exact match;
				resp=true;
			} else if (command_test.indexOf('<')==-1 && command_test.indexOf('>')==-1 && test2.includes(num.toString())==false) {
				resp=false;

			} else if (command_test.indexOf('<')!=-1 || command_test.indexOf('>')!=-1) {
				// test may be >2,<5,>7
				// 'and/all' (>2,<7)
				for (let i of test2) {
					if (i.charAt(0)=='>') {
						if (num<=parseInt(i.replace('>',''))) {
							resp=false;
							break;
						}
					} else if (i.charAt(0)=='<') {
						if (num>=parseInt(i.replace('<',''))) {
							resp=false;
							break;
						}
					}
				}
			}
		}
	} else {
		resp=false;
	}
	return resp;
}

function getVal(project, myPath){
    return myPath.split('.').reduce ( (res, prop) => res[prop], project );
}

function setImmediatePromise() {
	//for preventing freezing node thread within loops (fors)
	return new Promise((resolve) => {
	  setImmediate(() => resolve());
	});
}

// end: private helper methods