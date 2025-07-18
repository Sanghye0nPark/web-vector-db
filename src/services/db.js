export class VectorDB {
    constructor(dimensions) {
        this.vectors = [];
        this.dimensions = dimensions;
        this.size = 0;
    }

    addVector(vector) {
        this.vectors.push(vector);
        this.size++;
    }
    
    getVector(index) {
        return this.vectors[index];
    }
    
    getSize() {
        return this.size;
    }
    
    getDimensions() {
        return this.dimensions;
    }

    // 벡터 삭제
    removeVector(index) {
        if (index >= 0 && index < this.vectors.length) {
            this.vectors.splice(index, 1);
            this.size--;
            return true;
        }
        return false;
    }

    // 모든 벡터 가져오기
    getAllVectors() {
        return [...this.vectors];
    }

    // 벡터 업데이트
    updateVector(index, newVector) {
        if (index >= 0 && index < this.vectors.length) {
            if (newVector.length !== this.dimensions) {
                throw new Error(`벡터는 ${this.dimensions}차원이어야 합니다.`);
            }
            this.vectors[index] = [...newVector];
            return true;
        }
        return false;
    }
}

