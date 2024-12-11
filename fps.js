            import * as THREE from 'three';

			import Stats from 'three/addons/libs/stats.module.js';

			import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

			import { Octree } from 'three/addons/math/Octree.js';
			import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';

			import { Capsule } from 'three/addons/math/Capsule.js';

			import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

			const clock = new THREE.Clock();

			const scene = new THREE.Scene();
			scene.background = new THREE.Color( 0x88ccee );
			scene.fog = new THREE.Fog( 0x88ccee, 0, 50 );

			const camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 1000 );
			camera.rotation.order = 'YXZ';

			const fillLight1 = new THREE.HemisphereLight( 0x8dc1de, 0x00668d, 1.5 );
			fillLight1.position.set( 2, 1, 1 );
			scene.add( fillLight1 );

			const directionalLight = new THREE.DirectionalLight( 0xffffff, 2.5 );
			directionalLight.position.set( - 5, 25, - 1 );
			directionalLight.castShadow = true;
			directionalLight.shadow.camera.near = 0.01;
			directionalLight.shadow.camera.far = 500;
			directionalLight.shadow.camera.right = 30;
			directionalLight.shadow.camera.left = - 30;
			directionalLight.shadow.camera.top	= 30;
			directionalLight.shadow.camera.bottom = - 30;
			directionalLight.shadow.mapSize.width = 1024;
			directionalLight.shadow.mapSize.height = 1024;
			directionalLight.shadow.radius = 4;
			directionalLight.shadow.bias = - 0.00006;
			scene.add( directionalLight );

			const container = document.getElementById( 'container' );

			const renderer = new THREE.WebGLRenderer( { antialias: true } );
			renderer.setPixelRatio( window.devicePixelRatio );
			renderer.setSize( window.innerWidth, window.innerHeight );
			renderer.setAnimationLoop( animate );
			renderer.shadowMap.enabled = true;
			renderer.shadowMap.type = THREE.VSMShadowMap;
			renderer.toneMapping = THREE.ACESFilmicToneMapping;
			container.appendChild( renderer.domElement );

			const stats = new Stats();
			stats.domElement.style.position = 'absolute';
			stats.domElement.style.top = '0px';
			container.appendChild( stats.domElement );

			const GRAVITY = 30;

			const worldOctree = new Octree();

			const playerCollider = new Capsule( new THREE.Vector3( 0, 0.35, 0 ), new THREE.Vector3( 0, 1, 0 ), 0.35 );

			const playerVelocity = new THREE.Vector3();
			const playerDirection = new THREE.Vector3();

			let playerOnFloor = false;
			let mouseTime = 0;

			const keyStates = {};

			const vector1 = new THREE.Vector3();
			const vector2 = new THREE.Vector3();
			const vector3 = new THREE.Vector3();

			document.addEventListener( 'keydown', ( event ) => {

				keyStates[ event.code ] = true;

			} );

			document.addEventListener( 'keyup', ( event ) => {

				keyStates[ event.code ] = false;

			} );

			container.addEventListener( 'mousedown', () => {

				document.body.requestPointerLock();

				mouseTime = performance.now();

			} );

			document.body.addEventListener( 'mousemove', ( event ) => {

				if ( document.pointerLockElement === document.body ) {

					camera.rotation.y -= event.movementX / 500;
					camera.rotation.x -= event.movementY / 500;

				}

			} );

			window.addEventListener( 'resize', onWindowResize );

			function onWindowResize() {

				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();

				renderer.setSize( window.innerWidth, window.innerHeight );

			}

			function playerCollisions() {

				const result = worldOctree.capsuleIntersect( playerCollider );

				playerOnFloor = false;

				if ( result ) {

					playerOnFloor = result.normal.y > 0;

					if ( ! playerOnFloor ) {

						playerVelocity.addScaledVector( result.normal, - result.normal.dot( playerVelocity ) );

					}

					if ( result.depth >= 1e-10 ) {

						playerCollider.translate( result.normal.multiplyScalar( result.depth ) );

					}

				}

			}

			function updatePlayer( deltaTime ) {

				let damping = Math.exp( - 4 * deltaTime ) - 1;

				if ( ! playerOnFloor ) {

					playerVelocity.y -= GRAVITY * deltaTime;

					// small air resistance
					damping *= 0.1;

				}

				playerVelocity.addScaledVector( playerVelocity, damping );

				const deltaPosition = playerVelocity.clone().multiplyScalar( deltaTime );
				playerCollider.translate( deltaPosition );

				playerCollisions();

				camera.position.copy( playerCollider.end );

			}

			function getForwardVector() {

				camera.getWorldDirection( playerDirection );
				playerDirection.y = 0;
				playerDirection.normalize();

				return playerDirection;

			}

			function getSideVector() {

				camera.getWorldDirection( playerDirection );
				playerDirection.y = 0;
				playerDirection.normalize();
				playerDirection.cross( camera.up );

				return playerDirection;

			}

			function controls( deltaTime ) {

				// gives a bit of air control
				const speedDelta = deltaTime * ( playerOnFloor ? 25 : 8 );

				if ( keyStates[ 'KeyW' ] ) {

					playerVelocity.add( getForwardVector().multiplyScalar( speedDelta ) );

				}

				if ( keyStates[ 'KeyS' ] ) {

					playerVelocity.add( getForwardVector().multiplyScalar( - speedDelta ) );

				}

				if ( keyStates[ 'KeyA' ] ) {

					playerVelocity.add( getSideVector().multiplyScalar( - speedDelta ) );

				}

				if ( keyStates[ 'KeyD' ] ) {

					playerVelocity.add( getSideVector().multiplyScalar( speedDelta ) );

				}

				if ( playerOnFloor ) {

					if ( keyStates[ 'Space' ] ) {

						playerVelocity.y = 15;

					}

				}

			}

			const loader = new GLTFLoader().setPath( './models/gltf/' );

			loader.load( 'collision-world.glb', ( gltf ) => {

				scene.add( gltf.scene );

				worldOctree.fromGraphNode( gltf.scene );

				gltf.scene.traverse( child => {

					if ( child.isMesh ) {

						child.castShadow = true;
						child.receiveShadow = true;

						if ( child.material.map ) {

							child.material.map.anisotropy = 4;

						}

					}

				} );

				const helper = new OctreeHelper( worldOctree );
				helper.visible = false;
				scene.add( helper );

				const gui = new GUI( { width: 200 } );
				gui.add( { debug: false }, 'debug' )
					.onChange( function ( value ) {

						helper.visible = value;

					} );
			
			} );

			function teleportPlayerIfOob() {

				if ( camera.position.y <= - 25 ) {

					playerCollider.start.set( 0, 0.35, 0 );
					playerCollider.end.set( 0, 1, 0 );
					playerCollider.radius = 0.35;
					camera.position.copy( playerCollider.end );
					camera.rotation.set( 0, 0, 0 );

				}

			}


			function animate() {

				const deltaTime = Math.min( 0.05, clock.getDelta() ) / STEPS_PER_FRAME;

				// we look for collisions in substeps to mitigate the risk of
				// an object traversing another too quickly for detection.

				for ( let i = 0; i < STEPS_PER_FRAME; i ++ ) {

					controls( deltaTime );

					updatePlayer( deltaTime );

					teleportPlayerIfOob();

				}

				renderer.render( scene, camera );

				stats.update();

			}