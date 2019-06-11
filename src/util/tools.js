import * as THREE from "three"
function getClickObj(event,scene){
  const mouse = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  //通过鼠标点击的位置计算出raycaster所需要的点的位置，以屏幕中心为原点，值的范围为-1到1.

  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

  // 通过鼠标点的位置和当前相机的矩阵计算出raycaster
  raycaster.setFromCamera( mouse, camera );

  // 获取raycaster直线和所有模型相交的数组集合
  var intersects = raycaster.intersectObjects( scene.children );

  console.log(intersects);
  return intersects;
}

export {getClickObj}