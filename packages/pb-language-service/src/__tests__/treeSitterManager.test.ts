
import { TreeSitterManager } from '../parser/TreeSitterManager';

describe('TreeSitterManager', () => {
  let manager: TreeSitterManager;

  beforeEach(() => {
    manager = new TreeSitterManager();
  });

  test('should parse and cache a simple PowerBuilder script', () => {
    const uri = 'file:///test.sru';
    const text = 'forward\nfunction string test()\nend function';
    const version = 1;

    const tree = manager.parseAndCache(uri, text, version);

    expect(tree).toBeDefined();
    expect(tree.rootNode).toBeDefined();
  });

  test('should retrieve cached tree', () => {
    const uri = 'file:///test.sru';
    const text = 'forward\nfunction string test()\nend function';
    
    manager.parseAndCache(uri, text, 1);
    const tree = manager.getTree(uri);

    expect(tree).toBeDefined();
  });

  test('should remove document from cache', () => {
    const uri = 'file:///test.sru';
    const text = 'forward\nfunction string test()\nend function';
    
    manager.parseAndCache(uri, text, 1);
    manager.removeDocument(uri);
    
    const tree = manager.getTree(uri);
    expect(tree).toBeUndefined();
  });

  test('should clear all documents', () => {
    manager.parseAndCache('file:///test1.sru', 'function test1()\nend function', 1);
    manager.parseAndCache('file:///test2.sru', 'function test2()\nend function', 1);
    
    manager.clear();
    
    expect(manager.getTree('file:///test1.sru')).toBeUndefined();
    expect(manager.getTree('file:///test2.sru')).toBeUndefined();
  });
});
