function resolveTree(node){

  const MAX_LENGTH = 10

  if(node.children){
    //如果有children 说明该节点是被选中的 标记一下
    node.itemStyle = {
      color:"#00ffff"
    }
    if(node.children.length){
      //筛选出被选中的节点的下标 同时剪枝到Max_length
      let i = 0
      if(node.children.length >= MAX_LENGTH){
        node.children = node.children.filter( (v,k)=>{
          if(v.children){i = k > MAX_LENGTH ? MAX_LENGTH : k}
          return v.children || k < MAX_LENGTH
        } )
      }
      //把被选中的节点放到最中间（向上取整）
      let j = Math.floor(node.children.length / 2)
      let tmp = node.children[j];
      node.children[j] = node.children[i]
      node.children[i] = tmp
      node.children.map(v=>{
        resolveTree(v)
      })
    }else if(node.children.name){
      node.children = [node.children]
      resolveTree(node.children[0])
    }
  }
}

export {resolveTree}