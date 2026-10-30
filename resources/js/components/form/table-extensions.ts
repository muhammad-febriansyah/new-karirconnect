import { Node } from '@tiptap/react';

export const Table = Node.create({
    name: 'table',
    group: 'block',
    content: 'tableRow+',
    isolating: true,

    parseHTML() {
        return [{ tag: 'table' }];
    },

    renderHTML() {
        return ['table', ['tbody', 0]];
    },
});

export const TableRow = Node.create({
    name: 'tableRow',
    content: '(tableHeader | tableCell)+',

    parseHTML() {
        return [{ tag: 'tr' }];
    },

    renderHTML() {
        return ['tr', 0];
    },
});

const cellAttributes = {
    colspan: {
        default: 1,
        parseHTML: (element: HTMLElement) => Number(element.getAttribute('colspan')) || 1,
    },
    rowspan: {
        default: 1,
        parseHTML: (element: HTMLElement) => Number(element.getAttribute('rowspan')) || 1,
    },
};

export const TableCell = Node.create({
    name: 'tableCell',
    content: 'block+',
    isolating: true,

    addAttributes() {
        return cellAttributes;
    },

    parseHTML() {
        return [{ tag: 'td' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['td', HTMLAttributes, 0];
    },
});

export const TableHeader = Node.create({
    name: 'tableHeader',
    content: 'block+',
    isolating: true,

    addAttributes() {
        return cellAttributes;
    },

    parseHTML() {
        return [{ tag: 'th' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['th', HTMLAttributes, 0];
    },
});
