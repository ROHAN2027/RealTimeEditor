// TLdrawBlot.js
import Quill from 'quill';

// 1. Grab the base class from Quill's internal engine
const BlockEmbed = Quill.import('blots/block/embed');

export class TLdrawBlot extends BlockEmbed {
    static blotName = 'tldraw-board';
    static tagName = 'div';
    static className = 'custom-tldraw-blot';

    static create(value) {
        const node = super.create();
        node.setAttribute('data-drawing-id', value.id);
        node.setAttribute('contenteditable', 'false');
        // Prevents users from typing inside the box

        // Styling the placeholder box
        node.style.width = '100%';
        node.style.width = '100%';
        node.style.minHeight = '100px';
        node.style.display = 'flex';
        node.style.justifyContent = 'center';
        node.style.alignItems = 'center';
        node.style.margin = '10px 0';
        node.style.cursor = 'pointer';

        this.updateContents(node, value);

        return node;
    }

    static updateContents(node, value){
        node.innerHTML = ''; // Clear existing content
        if(value.url) {
            const img = document.createElement('img');
            img.setAttribute('src', value.url);
            img.style.maxWidth = '100%';
            img.style.display = 'block';
            node.appendChild(img);
            
            node.style.border = '1px solid #ddd';
            node.style.backgroundColor = 'transparent';
        }else{
            node.innerText = `Click to open TLdraw(${value.id})`;
            node.style.backgroundColor = '#fef2f2';
            node.style.border = '3px dashed #ef4444';
            node.style.color = '#ef4444';
            node.style.padding = '20px';
            node.style.fontWeight = 'bold';
           
        }
    }

    format(name,value){
        if(name === TLdrawBlot.blotName && value) {
            this.domNode.setAttribute('data-drawing-id', value.id);
            
            // 2. If a URL exists, clear the 'Click to open' text and inject the image
            if (value.url) {
                this.domNode.innerHTML = ''; // Clear placeholder text
                const img = document.createElement('img');
                img.setAttribute('src', value.url);
                img.style.maxWidth = '100%';
                img.style.display = 'block';
                
                this.domNode.appendChild(img);
                
                // Remove the "Red Box" styles
                this.domNode.style.border = '1px solid #ddd';
                this.domNode.style.backgroundColor = 'transparent';
            }
        }else{
            super.format(name,value);
        }
    }

    static value(node) {
        return {
            id: node.getAttribute('data-drawing-id'),
            url: node.querySelector('img')?.getAttribute('src')|| null
        };
    }
}