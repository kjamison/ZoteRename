
//create new ZoteRename every time a new firefox window opens
Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
          .getService(Components.interfaces.mozIJSSubScriptLoader)
          .loadSubScript("chrome://zoterename/content/zoterename.js");

/*
// Only create main object once
if (typeof Zotero.ZoteRename == "undefined") {
	Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
						.getService(Components.interfaces.mozIJSSubScriptLoader)
						.loadSubScript("chrome://zoterename/content/zoterename.js");
}*/