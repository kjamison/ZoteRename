var ZoteRename = {
	prefs: null,
	search_callback_added: false,

	init: function () {
	
		this.prefs = Components.classes["@mozilla.org/preferences-service;1"].
		            getService(Components.interfaces.nsIPrefService);
		this.prefs = this.prefs.getBranch("extensions.zoterename.");
		

		var cm = document.getElementById('zotero-itemmenu');

		cm.addEventListener("popupshowing", this.showRenameMenu, false);
		// Register the callback in Zotero as an item observer
		var notifierID = Zotero.Notifier.registerObserver(this.notifierCallback, ['item']);

    
    //since the itemView changes every time a new collection is selected,
    //have add a function to add the search callback every time the user searches
    document.getElementById('zotero-tb-search').addEventListener('focus', this.addSearchCallback, false);

		// Unregister callback when the window closes (important to avoid a memory leak)
		window.addEventListener("unload", function(e) {
				Zotero.Notifier.unregisterObserver(notifierID);
				document.getElementById('zotero-tb-search').removeEventListener('focus', ZoteRename.addSearchCallback, false);
		}, false);

    /*
		//execute function when the page url is finally known
		var appcontent = document.getElementById("appcontent");   // browser
    if(appcontent)
      appcontent.addEventListener("DOMContentLoaded", Zotero.ZoteRename.onFirstPageLoad, false);*/
	},
	
	/*
	onFirstPageLoad: function(){
    var url = window.content.location;
    var fullscreen_url = Zotero.ZoteRename.prefs.getCharPref("fullscreen_url");
    
    if(url == fullscreen_url){
      ZoteroPane.fullScreen(true);  
      ZoteroPane.toggleDisplay(true);  
      //document.getElementById('zotero-pane').hidden = false;
    }
    
    //only needed it to run once per window, so remove listener now
    var appcontent = document.getElementById("appcontent");   // browser
    if(appcontent)
      appcontent.removeEventListener("DOMContentLoaded", Zotero.ZoteRename.onFirstPageLoad, false);   
	},*/
  
	showRenameMenu: function(event) {
    var doshow_item = true;
		var doshow_attach = true;
		var show_autorename = true;
		
		var zotver = Zotero.version;
		
		var items = ZoteroPane.getSelectedItems();
		doshow_item = (items.length == 1) && (items[0].isRegularItem() || items[0].isNote());
      
		for(var i = 0; i < items.length; i++){
			doshow_attach = doshow_attach & items[i].isAttachment();
		}
		
		zotver_parts = zotver.split('b');
		
		if(parseInt(zotver_parts[0]) >= 2){
			if(zotver_parts.length > 1)
				show_autorename = parseInt(zotver_parts[1]) < 5;
			else
				show_autorename = false;
		}

		document.getElementById("zoterename_menu_sep").hidden = !(doshow_item || doshow_attach);
		document.getElementById("zoterename_menu_caption").hidden = !(doshow_item || doshow_attach);
		document.getElementById("zoterename-collections_menuitem").hidden = !(doshow_item || doshow_attach);
		document.getElementById("zoterename-autorename_menuitem").hidden = !(show_autorename && doshow_attach);
		document.getElementById("zoterename-rename_menuitem").hidden = !doshow_attach;
		document.getElementById("zoterename-change_title_menuitem").hidden = !doshow_attach;
	},
	
	openOptions: function (paneID, action) {
		var io = {
			pane: paneID,
			action: action
		};
		window.openDialog('chrome://zoterename/content/options.xul',
			'zoterename-options',
			'chrome,titlebar,toolbar,centerscreen'
				+ Zotero.Prefs.get('browser.preferences.instantApply', true) ? 'dialog=no' : 'modal',
			io
		);
	},
	
	//eventually use this to display [sub]collections this item is in
	showCollections: function() {
    var items = ZoteroPane.getSelectedItems();
		
		if (!items) {
			return;
		}
		
		//var parent = Zotero.Items.get(items[0]);
		var parent = items[0];
		
		if(!items[0].isRegularItem())
      parent = Zotero.Items.get(items[0].getSource());
    
    // Remove item from parent collections
    var collexstr = '';
    
    var parentCollectionIDs = parent.getCollections();
    if (parentCollectionIDs) {
      for (var i=0; i<parentCollectionIDs.length; i++) {
		c = Zotero.Collections.get(parentCollectionIDs[i]);
		cstr = c.getName();
		while(c._getParent() != null){
			
			c = Zotero.Collections.get(c._getParent());
			cstr = c.getName() + " -> " + cstr;
		}
        collexstr = collexstr + cstr + '\n';
      }
      alert(collexstr);
     }
	},
	
	changeTitle: function() {
		var items = ZoteroPane.getSelectedItems();
		
		if (!items) {
			return;
		}

		for (var i=0; i<items.length; i++) {      
      var oldtitle = items[i].getField('title');
      var title = prompt('Enter new title:',oldtitle);
      if(title && title != oldtitle){
        items[i].setField('title',title);
        items[i].save();
      }
		}
	},
	
	renameItems: function(prompt_for_filename) {
		var items = ZoteroPane.getSelectedItems();
		
		if (!items) {
			return;
		}

		var newid = [];

		for (var i=0; i<items.length; i++) {
      var id=this.renameAttachment(items[i], prompt_for_filename);
      if(id){
        newid.push(id);
      }
		}
		
		if(newid.length > 0){
			//!!!!!maybe figure out how to select multiple?
			ZoteroPane.selectItem(newid[0]);
    }
	},

  
  addSearchCallback: function(){
    ZoteroPane.itemsView.addCallback(ZoteRename.searchCallback);
  },
  
  //after a search completes, collapse all the rows (if option set)
	searchCallback: function() {
    if(ZoteRename.prefs.getBoolPref("collapse_search")){
      window.setTimeout(function _collapseLater() {
        ZoteroPane.itemsView.collapseAllRows();
      }, 0);
    }
	},
	
	renameItem: function() {
    this.renameItems(true);
	},
	
	autoRenameItem: function() {
    this.renameItems(false);
	},
	
	renameAttachment: function(item, prompt_for_filename){
		//don't mess with html files because they can have all kinds of other 
		// stuff attached, or they might be snapshots in progress.
    if (!item.isAttachment() || item.getAttachmentMIMEType() == "text/html") {
      return false;
    }
    
    var itemID = item.id;

    var file = item.getFile();
    if(!file){
      alert("File is missing or invalid.");
      return false;
    }

    //var storagedir = Zotero.getStorageDirectory(itemID));
    var title = item.getField('title');
    var filepath = file.path;
    var sourceItemID = item.getSource();
    var parentItem = Zotero.Items.get(sourceItemID);
    
    
    
    var ext = filepath.substring(filepath.lastIndexOf('.'));
    var newname = Zotero.Attachments.getFileBaseNameFromItem(sourceItemID);
    newname += ext;
    
    if(prompt_for_filename){
      var promptstr = 'Enter new filename:';
      if(file.leafName != newname){
        promptstr += '\n\n[Auto-generated]\n' + newname;
      }
      var filename = prompt(promptstr,file.leafName);
      if(!filename)
        return;
      
      //remove ext if present so we can make sure it's the same as before
      if(filename.indexOf('.') >= 0)
        filename = filename.substring(0,filename.lastIndexOf('.'));
        
      filename = filename.replace(/[\/\\\?\*:|"<>\.]/g, '');
      
      if(!filename)
        return;
      
      newname = filename + ext;
    }
	    
    if(file.leafName == newname){ //file already named correctly
      return false;
    }

    var newfile = this.copyForce(file,this.getTempDir(),newname);
    if(!newfile){
			return false;
    }

    attachmentID = Zotero.Attachments.importFromFile(newfile, sourceItemID);
    
    try {
			//remove the temp file no matter what
      newfile.remove(false);
      
      //only remove original if re-attachment was successful
      if(attachmentID){
        newitem = Zotero.Items.get(attachmentID);

        //copy fields (title, url, access date, etc...) from orig item
        var uf = item.getUsedFields(true);
        for (var j = 0; j < uf.length; j++){
          newitem.setField(uf[j],item.getField(uf[j]));
        }
        newitem.attachmentLinkMode = item.attachmentLinkMode;
      
        item.erase();
        newitem.save();
        
        return attachmentID;
      } else {
        throw "Renaming failed.  Try again.";
      }
    } catch (e) {
      alert(e);
    }
  
	},

	//since copyTo won't overwrite, first delete destination file if it exists
	copyForce: function(file, destdir, newfilename){
    var newfile = destdir.clone();
    newfile.append(newfilename);

    if(newfile.exists()){
      newfile.remove(false);
    }
    file.copyTo(destdir,newfilename);
    
    return newfile;
	},
	
	getTempDir: function(){
    return Components.classes["@mozilla.org/file/directory_service;1"].
                       getService(Components.interfaces.nsIProperties).
                       get("TmpD", Components.interfaces.nsIFile);
	},

	// Callback implementing the notify() method to pass to the Notifier
	notifierCallback: {
		notify: function(event, type, ids, extraData) {
      if(type == 'collection'){
        alert('heya');
      }
			if (type == 'item' && event == 'add' 
				&& ZoteRename.prefs.getBoolPref("auto_rename")) {

				// Retrieve the added/modified items as Item objects
				var items = Zotero.Items.get(ids);
					
				for each(var item in items){
					try {
						if(item.isAttachment()){
							var file = item.getFile();
							if(!file){
								continue;
							}

							
							var sourceItemID = item.getSource();
							if(!sourceItemID){
								continue
							}
							
							var parentItem = Zotero.Items.get(sourceItemID);
							if(parentItem.numAttachments(false) == 1){ //since it's already been added
								ZoteRename.renameAttachment(item);
							}
							
						}
					} catch (e) {
						alert(e);
					}
				}
			}
		}
	}

};

window.addEventListener("load", function(e) { ZoteRename.init(); }, false);
