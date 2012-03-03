# Scripted Writing

## Install

Nothing as of yet. But eventually it is just a script to include in the page. 

## How to Use

In a system such as Tumblr or reMark, one has the ability to control the "environment" scripts, but does not have the power to control script running from the content itself. 

This system uses the following conventions. 

If a link's text starts with `RUN:` then it is assumed that this is a link that contains a script to be run immediately. Actually, it will be to an HTML page that will run the script if run. But there should also be a script of the same name and path that will actually be loaded. In this way, it has a graceful fallback. So in the Tumblr dashboard where this script does not work, one will have a link that leads to the active page. 

The other convention is an included script. Inside a pre-code block, if there is a comment that says  //RUN: then the code will be run. This is good for something very short. The code will appear in the text. 

Other conventions may appear as I use this. 

Requires jquery