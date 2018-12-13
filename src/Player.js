class Player {

    constructor(scene) {
        
        this.scene = scene;

        this.statuses = {
            'RUNNING': true,
            'JUMPING': false,
            'DRAGGING': false,
            'FALLING_DOWN' : false,
            'DEAD': false
        };

        /**
         * HUD Controls
         */
        this.coinsTextControl = null;
        this.metersTextControl = null;

        /**
         * Set it to true to make the player indestructible for tests
         */
        this.godMode = false;

        this.defaultSpeed = 15;
        this.speed = this.defaultSpeed;

        this.gravity = -12;
        
        /**
         * Stores the player last altitude to check if the player is falling down
         */
        this.jumpForce = 0.8;
        this.jumpMaxAltitude = 3.2;
        
        // Stores the last player altitude from every frame
        this.lastAltitude = 0.25;
        
        this.coins = 0;

        this.onDie = null;

        /**
         * Used to store the travelled distance and calculate where to generate more level tiles
         * and to give points to the player
         * The travelledDistance will reset each 100 "meters". When travelledDistance is equal to 70
         * the Level will generate more tiles
         */
        this.travelledDistance = 0;
        this.totalTravelledDistance = 0;
        
        /**
         * Method to set an ellipsoid (for collision) based on boundingbox size 
         */ 
        BABYLON.Mesh.prototype.setEllipsoidPerBoundingBox = function(scene) {
            var bi = this.getBoundingInfo();
            var bb = bi.boundingBox;
            this.ellipsoid = bb.maximumWorld.subtract(bb.minimumWorld).scale(0.5);
        }

        this.mesh = BABYLON.MeshBuilder.CreateBox("player", {
            width: 0.3333333, 
            height: 0.5, 
            depth: 0.3333333
        }, this.scene);

        this.mesh.position.y = 0.25;

        let playerMaterial = new BABYLON.StandardMaterial("playerMaterial", this.scene);
        playerMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 1);

        this.mesh.material = playerMaterial;

        this.mesh.setEllipsoidPerBoundingBox();

        this.createHUD();

        //GAME.drawEllipsoid(this.mesh);

    }

    createHUD() {
        this.hud = new UI('playerHudUI');
        
        this.metersTextControl = this.hud.addText('Meters: 0', {
            'top': '10px',
            'left': '10px',
            'horizontalAlignment': BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT
        });

        this.coinsTextControl = this.hud.addText('Coins: 0', {
            'top': '10px',
            'left': '-10px',
            'horizontalAlignment': BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT
        });
    }

    setStatus(status, value = true) {
        this.statuses[status] = value;
    }

    getMesh() {
        return this.mesh;
    }

    move() {

        let animationRatio = (this.scene.getAnimationRatio() / 50),
            gravity = (this.godMode) ? 0 : (this.gravity / 100),
            jump = (this.statuses.JUMPING && !this.statuses.FALLING_DOWN) ? this.jumpForce : 0,
            runSpeed = this.speed * animationRatio;

        // If is jumping, multiply the speed by 1.5
        runSpeed *= (this.statuses.JUMPING) ? 1.5 : 1;

        this.mesh.moveWithCollisions(new BABYLON.Vector3(
            0, 
            gravity + jump, 
            runSpeed
        ));
        
        this.checkPlayerLateralMovement(animationRatio);
        this.calculateTravelledDistance(animationRatio);
        
        this.checkPlayerJump();
        this.checkPlayerAltitude();
        this.checkPlayerDragging();
        

        if(this.mesh.position.y <= -2 && !this.statuses.DEAD) {
            this.setStatus('DEAD', true);
            this.die();
        }

    }

    calculateTravelledDistance(animationRatio) {
        if(this.travelledDistance >= 100) {
            this.travelledDistance = 0;
        }

        this.travelledDistance += this.speed * animationRatio;
        this.totalTravelledDistance += this.speed * animationRatio;

        this.metersTextControl.text = 'Meters: ' + Math.floor(this.totalTravelledDistance);
    }

    checkPlayerAltitude() {
        if(this.mesh.position.y < this.lastAltitude) {
            this.setStatus('FALLING_DOWN', true);
        } else {
            this.setStatus('FALLING_DOWN', false);
        }

        this.lastAltitude = this.mesh.position.y;
    }

    checkPlayerLateralMovement(animationRatio) {
        if(GAME.keys.left && !this.statuses.JUMPING && !this.statuses.FALLING_DOWN) {
            this.mesh.position.x -= (this.speed / 5) * animationRatio;
        }

        if(GAME.keys.right && !this.statuses.JUMPING && !this.statuses.FALLING_DOWN) {
            this.mesh.position.x += (this.speed / 5) * animationRatio;
        }
    }

    checkPlayerJump() {
        if(GAME.keys.up && !this.statuses.JUMPING && !this.statuses.FALLING_DOWN) {
            this.setStatus('JUMPING', true);
        }

        /**
         * If the player reaches the jump max altitude, then we change JUMPING status to false
         * and "hack" the lastAltitude adding more 1 unit (it is necessary because the method checkPlayerAltitude will
         * detect FALLING_DOWN only on the next animation frame if we dont make it, 
         * and it will crash the method checkPlayerDragging, immediataly setting the player position 
         * to the initial position)
         */
        if(this.mesh.position.y >= this.jumpMaxAltitude && this.statuses.JUMPING) {
            this.lastAltitude = this.lastAltitude + 1; // Hacking lastAltitude (explained above)
            this.setStatus('JUMPING', false);
        }
    }

    checkPlayerDragging() {
        if(GAME.keys.down) {
            
            this.setStatus('DRAGGING', true);
            this.mesh.scaling.y = 0.5;
            this.mesh.setEllipsoidPerBoundingBox();
            this.speed = this.defaultSpeed * 1.5;
            
        } else {
            
            if(!this.statuses.JUMPING && !this.statuses.FALLING_DOWN) {
                this.mesh.position.y = 0.25;
            }

            this.setStatus('DRAGGING', false);
            this.mesh.scaling.y = 1;
            this.mesh.setEllipsoidPerBoundingBox();
            this.speed = this.defaultSpeed;
            
        }
        
    }

    getTravelledDistance() {
        return this.travelledDistance;
    }

    keepCoin() {
        this.coins++;
        this.coinsTextControl.text = 'Coins: ' + this.coins;
    }

    reset() {
        
        this.setStatus('DEAD', false);
        this.setStatus('JUMPING', false);
        this.setStatus('FALLING_DOWN', false);
        this.setStatus('DRAGGING', false);
        
        this.mesh.position.x = 0;
        this.mesh.position.y = 0.25;
        this.mesh.position.z = 0;
        this.travelledDistance = 0;
        this.totalTravelledDistance = 0;
        
    }

    die() {
        if(this.onDie && !this.godMode) {
            this.onDie();
        }
    }

}