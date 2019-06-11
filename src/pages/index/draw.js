import * as THREE from 'three';
// import {CSS3DRenderer,CSS3DObject} from "threejs/renderers/CSS3DRenderer.js"
import TrackballControls from 'threejs/controls/TrackballControls';
import css3Warp from "./css3dRenderer"
import {getClickObj} from "util/tools.js"
import { Material } from 'three';
css3Warp(THREE)

const GUI_SWITCH = false

export default class Draw {
  constructor(container,doms,opt){
    this.container = container;
    this.opt = opt;
    this.doms = doms;
    this.width = container.clientWidth;
    this.height = container.clientHeight;
    this.scene = new THREE.Scene();
    this.glScene = new THREE.Scene();
    this.initCamera();
    if(GUI_SWITCH){
      this.gui = this.initGui();
    }
  }

  initObjs(){
    const {glScene,scene,doms} = this;
    const points = this.drawPath(glScene);
    doms.forEach( (v,k)=>{
      // v.style = 'display:block'
      const obj = new THREE.CSS3DObject(v);
      obj.position.copy(points[k+4])
      scene.add(obj)
    } )
  }

  drawPath(scene){
    const geometry = new THREE.CircleGeometry(550,5);
    geometry.rotateX(-0.45 * Math.PI);
    const material = new THREE.MeshBasicMaterial({color:0xffff00,side:THREE.DoubleSide});
    const circle = new THREE.Mesh(geometry,material);    
    scene && scene.add(circle)
    const points = circle.geometry.vertices;
    console.log("points",points)
    return points
  }

  initGui() {
    const gui = new function() {
      this.cX = 0;
      this.cY = 800;
      this.cZ = 1200;
      this.lookX = 0;
      this.lookY = 0;
      this.lookZ = -500;
    }();
    const datGui = new dat.GUI();
    datGui.add(gui, 'cX', -2000, 2500);
    datGui.add(gui, 'cY', -2000, 2500);
    datGui.add(gui, 'cZ', -2000, 2500);
    datGui.add(gui, 'lookX', -4000, 3500);
    datGui.add(gui, 'lookY', -4000, 3500);
    datGui.add(gui, 'lookZ', -5000, 3500);
    return gui;
  }

  initCamera() {
    const { width, height } = this;
    const camera = (this.camera = new THREE.PerspectiveCamera(
      40,
      width / height,
      1,
      10000
    ));
    camera.position.set(0,0,1500);
    camera.lookAt(new THREE.Vector3(0,0,0))
    window.camera = camera;
  }

  initTrackballControls() {
    const { camera, renderer } = this;
    const trackballControls = new TrackballControls(
      camera,
      renderer.domElement
    );
    trackballControls.rotateSpeed = 1.0;
    trackballControls.zoomSpeed = 1.2;
    trackballControls.panSpeed = 0.8;
    trackballControls.noZoom = false;
    trackballControls.noPan = false;
    trackballControls.staticMoving = true;
    trackballControls.dynamicDampingFactor = 0.3;
    trackballControls.keys = [65, 83, 68];
    trackballControls.minDistance = 500;
    trackballControls.maxDistance = 6000;

    return trackballControls;
  }

  onClick(e){
    const {scene} = this;
    const intersects = getClickObj(e,scene);
    
  }

  render() {
    const { width, height, container, camera, scene, gui, glScene } = this;

    window.addEventListener('click',this.onClick.bind(this),false)

    var axesHelper = new THREE.AxesHelper( 5 );
    glScene.add( axesHelper );
    this.initObjs()
    const renderer = (this.renderer = new THREE.CSS3DRenderer());
    renderer.setSize(width, height);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = 0;
    container.appendChild(renderer.domElement);

    const glRenderer = (this.glRenderer = new THREE.WebGLRenderer());
    // glRenderer.setClearColor(0x000000, 0);
    glRenderer.setSize(width,height)
    glRenderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(glRenderer.domElement)

    const trackballControls = this.initTrackballControls();
    const clock = new THREE.Clock();

    const render = () => {
      if(GUI_SWITCH){
        camera.position.set(gui.cX, gui.cY, gui.cZ);
        camera.lookAt(new THREE.Vector3(gui.lookX, gui.lookY, gui.lookZ));
      }else{
        trackballControls.update(clock.getDelta());
      }
      // TWEEN.update();
      this.rafId = requestAnimationFrame(render);

      renderer.render(scene, camera);
      glRenderer.render(glScene,camera)
    };

    render();
  }

}