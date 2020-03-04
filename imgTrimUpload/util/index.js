
module.exports = {
    // 获取设备像素比
    getPixelRatio: function(context) {
        var backingStore = context.backingStorePixelRatio ||
            context.webkitBackingStorePixelRatio ||
            context.mozBackingStorePixelRatio ||
            context.msBackingStorePixelRatio ||
            context.oBackingStorePixelRatio ||
            context.backingStorePixelRatio || 1;
        return (window.devicePixelRatio || 1) / backingStore;
    },

    // 上传时，限定规则的图片数量，大小，格式校验
    validate: function(filesArr, configs) {
        if (!configs || !Object.keys(configs).length) {
            return {
                flag: true,
            };
        }
        let alertText = ''; 

        // 数量校验
        const length = filesArr.length;
        if (configs.min && length < configs.min.value) {
            alertText = alertText.concat(' ' + configs.min.message);
        }
        if (configs.max && length > configs.max.value) {
            alertText = alertText.concat(' ' + configs.max.message);
        }
        filesArr.map((file, index) => {
            // 格式校验
            if (configs.filetype && !new RegExp(`(${configs.filetype.value})$`, 'i').test(file.type)) {
                alertText = alertText.concat(` 第${(index+1)}张` + configs.filetype.message);
            }

            // 大小校验
            if (configs.filesize && file.size > configs.filesize.value) {
                alertText = alertText.concat(` 第${(index+1)}张` + configs.filesize.message);
            }
        });
        if (alertText != '') {
            return {
                flag: false,
                message: alertText,
            };
        } else {
            return {
                flag: true,
            };
        }
    },

    // 建议规则
    adviceValidate: function(filesArr, configs) {
        if (!configs || !Object.keys(configs).length) {
            return {
                flag: true,
            };
        }

        let typeArr = [],
            sizeArr = [];

        filesArr.map((file, index) => {
            // 格式校验
            if (configs.adviceFiletype && !new RegExp(`(${configs.adviceFiletype.value})$`, 'i').test(file.type)) {
                typeArr.push(index+1)
            }

            // 大小校验
            if (configs.adviceFilesize && file.size > configs.adviceFilesize.value) {
                sizeArr.push(index+1)
            }
        });

        if (!typeArr.length || !sizeArr.length) {
            return {
                flag: false,
                typeArr,
                sizeArr
            };
        } else {
            return {
                flag: true,
            };
        }
    },

    // 读取图片原始信息
    filesInfo: function(file) {
        return new Promise((res, rej) => {
            let reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = function() {
                let image = new Image();
                let _this = this;
                image.onload = function() {
                    res({
                        size: file.size,
                        type: file.type,
                        name: file.name,
                        link: _this.result,
                        width: image.width,
                        height: image.height,
                    });
                };
                image.src = _this.result;
            };
        });
    },

    // 读取链接图片信息
    linkInfo: function(link) {
        return new Promise((res, rej) => {
            let image = new Image();
            let type = link.substring(link.lastIndexOf(".")+1);
            type = type === 'jpg' ? 'image/jpeg' : `image/${type}`;
            image.onload = function() {
                res({
                    type,
                    link,
                    width: image.width,
                    height: image.height,
                });
            };
            image.src = link;
        });
    },

    // 实例canvas需要的图片对象
    imageInfo: function(file, canvasDefaultSize, ratio, configs) {
        let _this = this;
        return new Promise((res, rej) => {
            let image = new Image();
            image.onload = function(e) {
                let proportion = image.width / image.height,
                    scale = proportion > 1 ? canvasDefaultSize / image.width : canvasDefaultSize / image.height,
                    canvasWidth = image.width * scale * ratio,
                    canvasHeight = image.height * scale * ratio;
                res({
                    scale, // 宽高缩放比例
                    canvasWidth, // canvas画布宽
                    canvasHeight, // canvas画布高
                    imgBase: image, // 图片实例
                    type: file.type, // 文件类型
                    size: file.size, // 文件大小
                    src: file.link, // 文件link
                    trimPosition: null, // 截图框参数
                    rotate: 0, // 旋转度数
                    judgeText: _this.judgeData(configs, canvasWidth, canvasHeight, scale, ratio) // 尺寸校验
                });
            };
            image.crossOrigin = 'Anonymous'; //解决跨域问题
            image.src = file.link;
        });
    },

    // 输入框尺寸
    inputData: function(data, min, max) {
        // 验证特殊字符和字母
        let regEn = /[`~!@#$%^&*()_+<>\-?:"{},.\/;'[\]]/im,
            regCn = /[·！#￥（——）：；=“”‘、，|《。》？、【】[\]]/im,
            regTr = /[a-z]/i
        if(regEn.test(data) || regCn.test(data) || regTr.test(data)) {
            return 0
        }
        if (eval(data) < min) {
            return min
        } else if (eval(data) > max) {
            return max
        } else {
            return eval(data)
        }
    },

    // 绘制canvas内部尺寸
    canvasData: function(data, scale, ratio) {
        return data * scale * ratio
    },

    // 还原原始尺寸(向下取整)
    resetData: function(data, scale, ratio) {
        return Math.round(data / scale / ratio)
    },

    // 返回值大于等于0
    nonNegativeData: function(data) {
        return data > 0 ? data : 0
    },

    // 不让其移除可视区
    fixedData: function(data, trimDistance, canvasDistance) {
        if ((this.nonNegativeData(data) + trimDistance) > canvasDistance) {
            return this.nonNegativeData(canvasDistance - trimDistance)
        } else {
            return this.nonNegativeData(data)
        }
    },

    // 尺寸校验
    judgeData: function(configs, canvasWidth, canvasHeight, scale, ratio) {
        let { maxHeight, maxWidth, minHeight, minWidth, maxRatio, minRatio } = configs,
        width = this.resetData(canvasWidth, scale, ratio),
        height = this.resetData(canvasHeight, scale, ratio);
        let proportion = width / height;
        if (proportion > 1) {
            proportion = Math.floor(proportion * 100) / 100;
        } else {
            proportion = Math.ceil(proportion * 100) / 100;
        }
        if (width < minWidth.value) {
            return minWidth.message
        } else if (width > maxWidth.value) {
            return maxWidth.message
        } else if (height < minHeight.value) {
            return minHeight.message
        } else if (height > maxHeight.value) {
            return maxHeight.message
        } else if (maxRatio && proportion > maxRatio.value) {
            return maxRatio.message
        } else if (minRatio && proportion < minRatio.value) {
            return minRatio.message
        }
        return false
    },

    // 尺寸优化
    optimalData: function(configs, optimalRatio, canvasWidth, canvasHeight, scale, ratio) {
        let { maxHeight, maxWidth, minHeight, minWidth } = configs,
            width = this.resetData(canvasWidth, scale, ratio),
            height = this.resetData(canvasHeight, scale, ratio),
            RW = Math.min(width, maxWidth),
            RH = (1 / optimalRatio) * RW;
        if (RH <= height) {
            if (RH >= minHeight) {
                return {
                    RW: this.canvasData(RW, scale, ratio),
                    RH: this.canvasData(RH, scale, ratio)
                }
            } else {
                if (height < minHeight) {
                    return {
                        RW: this.canvasData(RW, scale, ratio),
                        RH: this.canvasData(height, scale, ratio)
                    } 
                }
                return {
                    RW: this.canvasData(RW, scale, ratio),
                    RH: this.canvasData(minHeight, scale, ratio)
                }
            }
        } else {
            RH = Math.min(height, maxHeight);
            RW = optimalRatio * RH;
            if (RW >= minWidth) {
                return {
                    RH: this.canvasData(RH, scale, ratio),
                    RW: this.canvasData(RW, scale, ratio)
                }
            } else {
                if (width < minWidth) {
                    return {
                        RH: this.canvasData(RH, scale, ratio),
                        RW: this.canvasData(width, scale, ratio)
                    } 
                }
                return {
                    RH: this.canvasData(RH, scale, ratio),
                    RW: this.canvasData(minWidth, scale, ratio)
                }
            }
        }
    },

    // 转换坐标为负时的坐标
    transformDot: function(trimPosition) {
        if (trimPosition.height < 0) {
            trimPosition.startY += trimPosition.height;
            trimPosition.height = -trimPosition.height; 
        }
        if (trimPosition.width < 0) {
            trimPosition.startX += trimPosition.width;
            trimPosition.width = -trimPosition.width; 
        }
    },

    // 保存裁剪边框节点的坐标
    saveBorderArr: function(borderArr, borderSize, trimPosition) {
        let { startX, startY, width, height } = trimPosition,
            halfBorderSize = borderSize / 2;
        // move, n北s南e东w西, index为样式, option为操作
        borderArr[0] = { x: startX + halfBorderSize, y: startY + halfBorderSize, width: width - borderSize, height: height - borderSize, index: 1, option: 1 };
        // n
        borderArr[1] = { x: startX + halfBorderSize, y: startY, width: width - borderSize, height: halfBorderSize, index: 2, option: 2 };
        borderArr[2] = { x: startX - halfBorderSize + width / 2, y: startY - halfBorderSize, width: borderSize, height: halfBorderSize, index: 2, option: 2 };
        // s
        borderArr[3] = { x: startX + halfBorderSize, y: startY - halfBorderSize + height, width: width - borderSize, height: halfBorderSize, index: 2, option: 3 };
        borderArr[4] = { x: startX - halfBorderSize + width / 2, y: startY + height, width: borderSize, height: halfBorderSize, index: 2, option: 3 }
        // w
        borderArr[5] = { x: startX , y: startY + halfBorderSize, width: halfBorderSize, height: height - borderSize, index: 3, option: 4 };
        borderArr[6] = { x: startX - halfBorderSize, y: startY - halfBorderSize + height / 2, width: halfBorderSize, height: borderSize, index: 3, option: 4 };
        // e
        borderArr[7] = { x: startX - halfBorderSize + width, y: startY + halfBorderSize, width: halfBorderSize, height: height - borderSize, index: 3, option: 5 };
        borderArr[8] = { x: startX + width, y: startY - halfBorderSize + height / 2, width: halfBorderSize, height: borderSize, index: 3, option: 5 }
        // nw
        borderArr[9] = { x: startX - halfBorderSize, y: startY - halfBorderSize, width: borderSize, height: borderSize, index: 4, option: 6 }
        // se
        borderArr[10] = { x: startX - halfBorderSize + width, y: startY - halfBorderSize + height, width: borderSize, height: borderSize, index: 4, option: 7 }
        // ne
        borderArr[11] = { x: startX - halfBorderSize + width, y: startY - halfBorderSize, width: borderSize, height: borderSize, index: 5, option: 8 }
        // sw
        borderArr[12] = { x: startX - halfBorderSize, y: startY - halfBorderSize + height, width: borderSize, height: borderSize, index: 5, option: 9 }
    },

    // 操作裁剪框的坐标(当前鼠标坐标，裁剪框当前坐标，裁剪框宽高，操作方向)
    moveTrimPosition: function(currentX, currentY, startX, startY, width, height, option) {
        let tempStartX, tempStartY, tempWidth, tempHeight;
        switch (option) {
            case 2: // n
                tempStartY = currentY - (startY + height) > 0 ? (startY + height) : currentY;
                tempHeight = this.nonNegativeData(height - (currentY - startY));
                return {
                    tempStartX: startX, tempStartY, tempWidth: width, tempHeight
                }
            case 3: // s
                tempHeight = this.nonNegativeData(currentY - startY);
                return {
                    tempStartX: startX, tempStartY: startY, tempWidth: width, tempHeight
                }
            case 4: // w
                tempStartX = currentX - (startX + width) > 0 ? (startX + width) : currentX;
                tempWidth = this.nonNegativeData(width - (currentX - startX));
                return {
                    tempStartX, tempStartY: startY, tempWidth, tempHeight: height
                }
            case 5: // e
                tempWidth = this.nonNegativeData(currentX - startX);
                return {
                    tempStartX: startX, tempStartY: startY, tempWidth, tempHeight: height
                }
            case 6: // nw
                tempStartX = currentX - (startX + width) > 0 ? (startX + width) : currentX;
                tempStartY = currentY - (startY + height) > 0 ? (startY + height) : currentY;
                tempWidth = this.nonNegativeData(width - (currentX - startX));
                tempHeight = this.nonNegativeData(height - (currentY - startY));
                return {
                    tempStartX, tempStartY, tempWidth, tempHeight
                }
            case 7: // se
                tempWidth = this.nonNegativeData(currentX - startX);
                tempHeight = this.nonNegativeData(currentY - startY);
                return {
                    tempStartX: startX, tempStartY: startY, tempWidth, tempHeight
                }
            case 8: // ne
                tempStartY = currentY - (startY + height) > 0 ? (startY + height) : currentY;
                tempWidth = this.nonNegativeData(currentX - startX);
                tempHeight = this.nonNegativeData(height - (currentY - startY));
                return {
                    tempStartX: startX, tempStartY, tempWidth, tempHeight
                }
            case 9: // sw
                tempStartX = currentX - (startX + width) > 0 ? (startX + width) : currentX;
                tempWidth = this.nonNegativeData(width - (currentX - startX));
                tempHeight = this.nonNegativeData(currentY - startY);
                return {
                    tempStartX, tempStartY: startY, tempWidth, tempHeight
                }
        }
    },

    // 上传图片
    uploadImgs: function(uploadUrl, files, index) {
        return new Promise((res, rej) => {
            let fd = new FormData();
            fd.append('image', files);
            // 创建XMLHttpRequest 提交对象
            let xhr = new XMLHttpRequest();
            
            xhr.onreadystatechange = function () {
                if (this.readyState === 4) {
                    if (this.status === 200) {
                        let data = JSON.parse(this.responseText)
                        if (data.status.code == 1001) {
                            res(data.result.surl)
                        } else {
                            rej()
                        }
                    } else {
                        // var resJson = { code: this.status, response: this.response }
                        rej()
                    }
                }
            }

            //跨域传cookie的时候有用
            xhr.withCredentials = true;
            xhr.open("POST", uploadUrl, true);
            xhr.setRequestHeader('Access-Control-Allow-Headers','*');
            xhr.send(fd);
        })
    }
};
