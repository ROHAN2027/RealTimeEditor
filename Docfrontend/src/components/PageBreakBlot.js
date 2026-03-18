import Quill from 'quill';

// 1. Grab the base BlockEmbed class from Quill's internal engine
const BlockEmbed = Quill.import('blots/block/embed');

export class PageBreakBlot extends BlockEmbed {
    // 2. Define how Quill identifies this specific blot
    static blotName = 'page-break';
    
    // 3. Define the actual HTML tag it creates (Horizontal Rule / Line)
    static tagName = 'hr';
    
    // 4. Attach the CSS class we styled earlier
    static className = 'custom-page-break';

    static create(value) {
        const node = super.create();
        
        // Make it non-editable so the user's cursor doesn't get trapped inside the line
        node.setAttribute('contenteditable', 'false'); 
        
        // Add a tooltip so if they hover over it, they know what it is
        node.setAttribute('title', 'Manual Page Break');
        
        return node;
    }
}