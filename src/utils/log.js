class Log {
    constructor(name, enable=true){
        this.name = name;
        this.enable = enable;
    }

    debug(){
        [].unshift.call(arguments, "[DEBUG]");
        this.print.apply(this, arguments);
    }

    d(){
        [].unshift.call(arguments, "[DEBUG]");
        this.print.apply(this, arguments);
    }

    p(){
        this.print.apply(this, arguments);
    }

    f(){
        this.force.apply(this, arguments);
    }

    force(){
        if(this.name){
            [].unshift.call(arguments, "["+this.name+"]");
        }
        console.log.apply(this,arguments);
    }

    print(){
        if(this.name){
            [].unshift.call(arguments, "["+this.name+"]");
        }
        if(this.enable){
            console.log.apply(this,arguments);
        }
    }
}

module.exports = Log;

