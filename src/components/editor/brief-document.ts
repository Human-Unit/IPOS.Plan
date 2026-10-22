import { flattenBlocks, type Block, type PortablePlan } from '@/lib/schema/plan';

/** Editor-only nodes. These types never cross the persistence/share boundary. */
export type EditorNode = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: EditorNode[];
};

function gallery(nodes: EditorNode[]): EditorNode[] {
  const result: EditorNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const run: EditorNode[] = [];
    while (i < nodes.length && nodes[i].type === 'image' && !nodes[i].children?.length) run.push(nodes[i++]);
    if (run.length) {
      result.push(run.length === 1 ? run[0] : {id: `media:${run[0].id}`, type: 'mediaStrip', props: {}, children: run});
      i--;
    } else result.push(nodes[i]);
  }
  return result;
}

export function projectBriefs(blocks: readonly Block[]): EditorNode[] {
  const result: EditorNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type !== 'task') {
      result.push({...block, ...(block.children ? {children: projectBriefs(block.children)} : {})});
      continue;
    }
    let end = i + 1;
    while (end < blocks.length && !['task','divider'].includes(blocks[end].type)) end++;
    const children: EditorNode[] = [];
    if (block.children !== undefined) children.push({
      id: `children:${block.id ?? i}`, type: 'briefChildren', props: {}, children: projectBriefs(block.children),
    });
    children.push(...gallery(projectBriefs(blocks.slice(i + 1, end))));
    result.push({id:block.id, type:'brief', props:{taskId:block.props.taskId, sourceChildren:block.children !== undefined}, children});
    i = end - 1;
  }
  return result;
}

export function serializeBriefs(nodes: readonly EditorNode[]): Block[] {
  return nodes.flatMap((node): Block[] => {
    if (node.type === 'mediaStrip' || node.type === 'briefChildren') return serializeBriefs(node.children ?? []);
    if (node.type === 'brief') {
      const children = node.children ?? [];
      const source = children.find(child => child.type === 'briefChildren');
      return [{
        ...(node.id ? {id:node.id} : {}), type:'task', props:{taskId:String(node.props?.taskId ?? '')},
        ...(source || node.props?.sourceChildren ? {children:serializeBriefs(source?.children ?? [])} : {}),
      }, ...serializeBriefs(children.filter(child => child !== source))];
    }
    return [{...node, ...(node.children ? {children:serializeBriefs(node.children)} : {})} as Block];
  });
}

export function findEditorNode(nodes: readonly EditorNode[], id: string): EditorNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findEditorNode(node.children ?? [], id);
    if (found) return found;
  }
}

/** Duplicate the whole brief, including legacy siblings and original children. */
export function duplicateBrief(plan: PortablePlan, id: string, uid: () => string): {plan:PortablePlan; id:string} {
  const projected = projectBriefs(plan.blocks);
  const original = findEditorNode(projected, id);
  if (!original || original.type !== 'brief') throw new Error('Выберите задачу для копирования.');
  const tasks = {...plan.tasks};
  const typography = {...plan.typography};
  const taskIds = new Map<string,string>();
  const copy = (node: EditorNode): EditorNode => {
    const nextId = uid();
    if (node.id && plan.typography?.[node.id]) typography[nextId] = {...plan.typography[node.id]};
    let props = node.props;
    if (node.type === 'brief' || node.type === 'task') {
      const sourceId = String(node.props?.taskId);
      let taskId = taskIds.get(sourceId);
      if (!taskId) {
        taskId = uid(); taskIds.set(sourceId, taskId);
        tasks[taskId] = {...plan.tasks[sourceId], id:taskId, title:`${plan.tasks[sourceId].title} — копия`};
      }
      props = {...props,taskId};
    }
    return {...node,id:nextId,props, ...(node.children ? {children:node.children.map(copy)} : {})};
  };
  const duplicate = copy(original);
  const insert = (nodes: EditorNode[]): EditorNode[] => nodes.flatMap(node => node.id === id ? [node,duplicate] : [{...node,...(node.children ? {children:insert(node.children)} : {})}]);
  const blocks = serializeBriefs(insert(projected));
  const existing = new Set(flattenBlocks(blocks).map(block => block.id));
  const nextTypography = Object.fromEntries(Object.entries(typography).filter(([key])=>existing.has(key)));
  return {plan:{...plan,blocks,tasks,...(Object.keys(nextTypography).length ? {typography:nextTypography} : {})},id:duplicate.id!};
}
