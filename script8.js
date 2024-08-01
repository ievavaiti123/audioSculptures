// ref: https://github.com/bentoBAUX/Rhythm-of-Three_Threejs/blob/main/index.html
//https://www.youtube.com/watch?v=n3rkF0el0AQ&t=13s


import * as THREE from 'three';

import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let noise = new SimplexNoise();

const exporter = new OBJExporter();

let renderer, scene, camera, controls;

let analyser, dataArray, audio, sampleRate, binFrequency;

const amplificationFactor = 15;

const fftSize = 1024;

const minFrequency = 400;
const maxFrequency = 10000;

let startIndex, endIndex;

let datGui, params;

let sphere, cube, previousVertices;





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
    audioLoader.load('audio/sample_3.wav', (buffer) => {
    audio.setBuffer(buffer);
    audio.loop = true;
    });
    analyser = new THREE.AudioAnalyser( audio, fftSize );
    console.log(analyser)
    let bufferLength = analyser.frequencyBinCount;
    dataArray = analyser.data;
    console.log(dataArray)

    //data filtering
    sampleRate = audio.context.sampleRate
    binFrequency = sampleRate / fftSize;
    //crete frequency range
    startIndex = Math.floor(minFrequency / binFrequency);
    endIndex = Math.ceil(maxFrequency / binFrequency);

    console.log(`Start Index: ${startIndex}, End Index: ${endIndex}`);
  
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

    let cubegeometry = new THREE.BoxGeometry(50, 50, 3, 5, 50, 5);
    let cubemesh = new THREE.MeshStandardMaterial();
    cube = new THREE.Mesh(cubegeometry, cubemesh);
    cubegeometry.verticesOriginal = cubegeometry.vertices.map(vertex => vertex.clone());
    scene.add(cube);

    // let sphereGeometry = new THREE.SphereGeometry(25, 70, 200); // Adjust the radius and segment count as needed
    // let sphereMaterial = new THREE.MeshStandardMaterial();
    // sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    // sphereGeometry.verticesOriginal = sphereGeometry.vertices.map(vertex => vertex.clone());

    // previousVertices = sphereGeometry.vertices.map(vertex => vertex.clone());

    // sphere.receiveShadow = true;
    // sphere.castShadow = true;

    // scene.add(sphere);


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
            console.log(cube.geometry.vertices)
        } else {
            audio.play();
            playPauseButton.textContent = 'Pause Audio';
        }
    });
    downloadButton.addEventListener('click', () => {
            const myObj = exporter.parse( scene );
            downloadFile('shape.obj', myObj);
    });

    let datGui = new dat.GUI();
        params = {
            widthSegments: 5,
            heightSegments: 50,
            depthSegments: 5,
        };

    datGui.add(params, 'widthSegments', 1, 50).step(1).onChange(updateGeometry);
    datGui.add(params, 'heightSegments', 1, 50).step(1).onChange(updateGeometry);
    datGui.add(params, 'depthSegments', 1, 50).step(1).onChange(updateGeometry);
    
}



function render() {
    requestAnimationFrame(render);
    controls.update();
    renderer.render(scene, camera);
    
    analyser.getFrequencyData(dataArray);

    const slicedDataArray = dataArray.slice(startIndex, endIndex);

    const smoothingFactor = 0.5; 
    const smoothedDataArray = smoothAudioData(slicedDataArray, smoothingFactor);

    // cube.rotation.x += 0.001;
    // ball.rotation.y += 0.005;
    // ball.rotation.z += 0.002;

    if (audio.isPlaying) {
        //console.log("yes");
        // WarpBall(ball, modulate(Math.pow(lowerAvgFr, 0.8), 0, 1, 0, 1), modulate(upperAvgFr, 0, 1, 0, 4));
        // WarpBox(cube, modulate(Math.pow(lowerAvgFr, 0.8), 0, 1, 0, 1), modulate(upperAvgFr, 0, 1, 0, 4));
        WarpBox(cube, slicedDataArray)
        //WarpSphere(sphere, smoothedDataArray)
    }
    
 
};

function smoothAudioData(audioData, smoothingFactor) {
    let smoothedData = new Float32Array(audioData.length);
    smoothedData[0] = audioData[0];
    for (let i = 1; i < audioData.length; i++) {
        smoothedData[i] = smoothingFactor * audioData[i] + (1 - smoothingFactor) * smoothedData[i - 1];
    }
    return smoothedData;
}

function updateGeometry() {
    scene.remove(cube);
    let cubegeometry = new THREE.BoxGeometry(50, 50, 2, params.widthSegments, params.heightSegments, params.depthSegments);
    let cubemesh = new THREE.MeshStandardMaterial();
    cube = new THREE.Mesh(cubegeometry, cubemesh);
    
    cubegeometry.verticesOriginal = cubegeometry.vertices.map(vertex => vertex.clone());
    scene.add(cube);
}



function WarpSphere(mesh_, audioData) {
    const numVertices = mesh_.geometry.vertices.length;
    const smoothingFactor = 0.5; 

    let stepSize = 5
    // Step 1: Affect every 5th vertex
    for (let i = 0; i < numVertices; i += stepSize) {
        let originalVertex = mesh_.geometry.verticesOriginal[i];
        
        // Normalize the frequency data to a value between 0 and 1
        let frequencyValue = audioData[(i / stepSize) % audioData.length] / fftSize;
        let amplifiedValue = frequencyValue * amplificationFactor;

        // Calculate the normal direction and apply the displacement
        let normal = originalVertex.clone().normalize();
        let displacement = normal.multiplyScalar(amplifiedValue);

        // Update the vertex position
        mesh_.geometry.vertices[i].copy(originalVertex).add(displacement);
        previousVertices[i].copy(mesh_.geometry.vertices[i]);
    }

    // Step 2: Smooth the vertices between the affected ones
    for (let i = 0; i < numVertices; i++) {
        if (i % stepSize !== 0) {
            let leftIndex = Math.floor(i / stepSize) * stepSize;
            let rightIndex = Math.min(leftIndex + stepSize, numVertices - 1);

            let leftVertex = previousVertices[leftIndex];
            let rightVertex = previousVertices[rightIndex];

            // Interpolate between the left and right affected vertices
            let t = (i % stepSize) / stepSize;
            let interpolatedVertex = leftVertex.clone().lerp(rightVertex, t);

            mesh_.geometry.vertices[i].lerp(interpolatedVertex, smoothingFactor);
        }
    }
    mesh_.geometry.verticesNeedUpdate = true;
}


function WarpBox(mesh_, audioData) {
    mesh_.geometry.vertices.forEach(function (vertex, i) {
        let originalVertex = mesh_.geometry.verticesOriginal[i]; 
        // if (vertex.z > 0) { 
            // Normalize the frequency data to a value between 0 and 1
            let frequencyValue = audioData[i % audioData.length] / 511.0;

            let amplifiedValue = frequencyValue * amplificationFactor;

            // Apply the displacement to the z coordinate directly
            vertex.copy(originalVertex);
            vertex.z += amplifiedValue;
        //}
    });
    //averageVertices(mesh_);

    // Notify Three.js of the updated vertices and normals
    mesh_.geometry.verticesNeedUpdate = true;
    mesh_.geometry.normalsNeedUpdate = true;
    mesh_.geometry.computeVertexNormals();
    mesh_.geometry.computeFaceNormals();
}

function map(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
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
