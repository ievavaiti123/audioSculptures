// ref: https://github.com/bentoBAUX/Rhythm-of-Three_Threejs/blob/main/index.html
//https://www.youtube.com/watch?v=n3rkF0el0AQ&t=13s


import * as THREE from 'three';

import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let noise = new SimplexNoise();

const exporter = new OBJExporter();

let renderer, scene, camera, controls;

let analyser, dataArray, audio;

let ball, cube;

setup();
gui();
render();


function setup() {
    //set up scene and camera
    scene = new THREE.Scene();
    let group = new THREE.Group();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    scene.add(camera);

    //setup renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor("#ffffff");
    document.body.appendChild(renderer.domElement);


    //orbit controls
	controls = new OrbitControls(camera, renderer.domElement);
	//controls.listenToKeyEvents(window);

    // Set initial camera position
	camera.position.set( 0, 20, 100 );
	controls.update();

    //setup container/canvas
    document.getElementById("sketch-container").appendChild( renderer.domElement);
    //setup audio
    const audioListener = new THREE.AudioListener();
    camera.add( audioListener );
    const audioLoader = new THREE.AudioLoader();
    audio = new THREE.Audio(audioListener);
    audioLoader.load('audio/granular-soundscape-2.wav', (buffer) => {
    audio.setBuffer(buffer);
    });
    analyser = new THREE.AudioAnalyser( audio, 512 );
    console.log(analyser)
    let bufferLength = analyser.frequencyBinCount;
    dataArray = analyser.data;
    console.log(dataArray)
  
    // AMBIENT LIGHT
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    // DIRECTIONAL LIGHT
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5)
    dirLight.position.x += 20
    dirLight.position.y += 20
    dirLight.position.z += 20
    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    const d = 10;
    dirLight.shadow.camera.left = - d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = - d;
    dirLight.position.z = -25;

    let target = new THREE.Object3D();
    target.position.z = -40;
    dirLight.target = target;
    dirLight.target.updateMatrixWorld();
    dirLight.shadow.camera.lookAt(0, 0, -20);
    scene.add(dirLight);

    //setup shape   
//     let geometry = new THREE.SphereGeometry(20, 100, 100);
//     let mesh = new THREE.MeshStandardMaterial();
//     ball = new THREE.Mesh(geometry, mesh);
//     ball.receiveShadow = true;
//     ball.castShadow = true;
//     group.add(ball);
//     //console.log()
//    scene.add(group);

    let cubegeometry = new THREE.BoxGeometry(20, 20, 2, 20, 20, 50);
    let cubemesh = new THREE.MeshStandardMaterial();
    cube = new THREE.Mesh(cubegeometry, cubemesh);
    //cube.receiveShadow = true;
   // cube.castShadow = true;
   //console.log(cube.geometry.vertices)
    group.add(cube);

    cubegeometry.verticesOriginal = cubegeometry.vertices.map(vertex => vertex.clone());

    //console.log(cube.geometry.verticesOriginal)

    scene.add(group);

    //setup window resize
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });

};

function gui() {
    // Create a button element reference
    const playPauseButton = document.getElementById('playPauseButton');
    const downloadButton = document.getElementById('downloadButton');
    // Handle button click to start audio playback
    playPauseButton.addEventListener('click', () => {
        if (audio.isPlaying) {
            audio.pause();
            playPauseButton.textContent = 'Play Audio';
            //console.log(cube);
            // console.log(ball.geometry.vertices)
        } else {
            audio.play();
            playPauseButton.textContent = 'Pause Audio';
        }
    });
    downloadButton.addEventListener('click', () => {
            const myObj = exporter.parse( scene );
            downloadFile('shape.obj', myObj);
    });
}



function render() {
    requestAnimationFrame(render);
    controls.update();
    renderer.render(scene, camera);
    
    analyser.getFrequencyData(dataArray);

    let lowerHalfArray = dataArray.slice(0, (dataArray.length / 2) - 1);
    let upperHalfArray = dataArray.slice((dataArray.length / 2) - 1, dataArray.length - 1);

    let overallAvg = avg(dataArray);
    let lowerMax = max(lowerHalfArray);
    let lowerAvg = avg(lowerHalfArray);
    let upperMax = max(upperHalfArray);
    let upperAvg = avg(upperHalfArray);

    let lowerMaxFr = lowerMax / lowerHalfArray.length;
    let lowerAvgFr = lowerAvg / lowerHalfArray.length;
    let upperMaxFr = upperMax / upperHalfArray.length;
    let upperAvgFr = upperAvg / upperHalfArray.length;

    // cube.rotation.x += 0.001;
    // ball.rotation.y += 0.005;
    // ball.rotation.z += 0.002;

    if (audio.isPlaying) {
        console.log("yes");
        // WarpBall(ball, modulate(Math.pow(lowerAvgFr, 0.8), 0, 1, 0, 1), modulate(upperAvgFr, 0, 1, 0, 4));
        WarpBox(cube, modulate(Math.pow(lowerAvgFr, 0.8), 0, 1, 0, 1), modulate(upperAvgFr, 0, 1, 0, 4));
    }
    
 
};

function WarpBall(mesh, bassFr, treFr) {
    mesh.geometry.vertices.forEach(function (vertex, i) {
        let offset = mesh.geometry.parameters.radius;
        let amp = 5;
        let time = window.performance.now();
        vertex.normalize();
        let rf = 0.00001;
        let distance = (offset + bassFr) + noise.noise3D(vertex.x + time * rf * 6, vertex.y + time * rf * 7, vertex.z + time * rf * 8) * amp * treFr;
        vertex.multiplyScalar(distance);
    });
    mesh.geometry.verticesNeedUpdate = true;
    mesh.geometry.normalsNeedUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeFaceNormals();
}

function WarpBox(mesh_, bassFr, treFr) {
    mesh_.geometry.vertices.forEach(function (vertex, i) {
        let originalVertex = mesh_.geometry.verticesOriginal[i]; 
       // console.log(originalVertex)
            if (vertex.z > 0) { 
            let offset = 3;  // Half of the box size
            let amp = 2;
            let time = window.performance.now();
            let rf = 0.0001;
            let displacement = noise.noise3D(vertex.x + time * rf * 6, vertex.y + time * rf * 7, vertex.z + time * rf * 8) * amp * treFr;
            
            // Apply the displacement to the z coordinate directly
            vertex.copy(originalVertex);
            vertex.z += displacement + bassFr;
        }
    });

    //averageVertices(mesh_);
    
    // Notify Three.js of the updated vertices and normals
    mesh_.geometry.verticesNeedUpdate = true;
    mesh_.geometry.normalsNeedUpdate = true;
    mesh_.geometry.computeVertexNormals();
    mesh_.geometry.computeFaceNormals();
}

function averageVertices(mesh) {
    let vertices = mesh.geometry.vertices;
    let verticesCopy = vertices.map(vertex => vertex.clone());
    
    for (let i = 0; i < vertices.length; i++) {
        let vertex = verticesCopy[i];
        let neighborIndices = getNeighborIndices(mesh, i);
        
        //let avgX = vertex.x;
        //let avgY = vertex.y;
        let avgZ = vertex.z;
        
        neighborIndices.forEach(index => {
            //avgX += verticesCopy[index].x;
            //avgY += verticesCopy[index].y;
            avgZ += verticesCopy[index].z;
        });
        
        let numNeighbors = neighborIndices.length + 1;
        //vertices[i].x = avgX / numNeighbors;
        //vertices[i].y = avgY / numNeighbors;
        vertices[i].z = avgZ / numNeighbors;
    }
    
    // Notify of the updated vertices and normals
    mesh.geometry.verticesNeedUpdate = true;
    mesh.geometry.normalsNeedUpdate = true;
    mesh.geometry.computeVertexNormals();
    mesh.geometry.computeFaceNormals();
}

function getNeighborIndices(mesh, vertexIndex) {
    let neighbors = new Set();
    let faces = mesh.geometry.faces;

    faces.forEach(face => {
        if (face.a === vertexIndex || face.b === vertexIndex || face.c === vertexIndex) {
            neighbors.add(face.a);
            neighbors.add(face.b);
            neighbors.add(face.c);
        }
    });

    neighbors.delete(vertexIndex); // Remove the vertex itself
    return Array.from(neighbors);
}

//helper functions
function fractionate(val, minVal, maxVal) {
    return (val - minVal) / (maxVal - minVal);
}

function modulate(val, minVal, maxVal, outMin, outMax) {
    let fr = fractionate(val, minVal, maxVal);
    let delta = outMax - outMin;
    return outMin + (fr * delta);
}

function avg(arr) {
    let total = arr.reduce(function (sum, b) { return sum + b; });
    return (total / arr.length);
}

function max(arr) {
    return arr.reduce(function (a, b) { return Math.max(a, b); })
}

function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    
    // Trigger a click event to initiate the download
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });
    
    a.dispatchEvent(event);
    
    // Clean up resources
    URL.revokeObjectURL(url);
  }
