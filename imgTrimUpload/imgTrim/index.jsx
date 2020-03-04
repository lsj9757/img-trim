import React from 'react';
import PropTypes from 'prop-types';
import './index.less';
import imgFn from '../util';
import { Icon, Button, InputNumber, message, Spin } from 'antd';
import 'antd/lib/icon/style/index';
import 'antd/lib/message/style/index';
import 'antd/lib/button/style/index';
import 'antd/lib/spin/style/index';
import 'antd/lib/input-number/style/index';

class ImgTrim extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            fileListArray: props.fileListArray,
            fileSelected: props.fileSelected,
            inputWidth: null,
            inputHight: null,
            judgeText: ''
        };
    }

    static propTypes = {
        // 图片规则
        configs: PropTypes.object,
        // canvas画布大小
        canvasDefaultSize: PropTypes.number,
        // 图片列表
        fileListArray: PropTypes.array,
        // 当前选中的图片位置
        fileSelected: PropTypes.number,
        // 关闭modal
        closeModal: PropTypes.func,
        // 尺寸优化回调
        optimalCallback: PropTypes.func,
        // 全部尺寸优化回调
        allOptimalCallback: PropTypes.func
    };

    static defaultProps = {
        fileListArray: [],
        fileSelected: 0
    };

    componentWillReceiveProps(props) {
        this.props = props;
        this.state.fileListArray = this.props.fileListArray || [];
        this.state.fileSelected = this.props.fileSelected || 0;
        this.state.inputWidth = null;
        this.state.inputHight = null;
        this.initialConfigs(); // 每张图片的初始化配置
        this.receiveImg(); // 接收图片, 初始化图片列表的信息
    }

    componentDidMount() {
        this.initialConfigs();
        this.receiveImg();
    }

    // 清除画布
    clearCanvas = () => {
        this.showImg = this.canvasRef.getContext('2d');
        this.saveImg = this.saveCanvasRef.getContext('2d');
        this.resultImg = this.resultCanvasRef.getContext('2d');
        // 清除画布
        this.showImg.clearRect(0, 0, this.canvasRef.width, this.canvasRef.height);
        this.saveImg.clearRect(0, 0, this.saveCanvasRef.width, this.saveCanvasRef.height);
        this.resultImg.clearRect(0, 0, this.resultCanvasRef.width, this.resultCanvasRef.height);
        // 初始化手势
        this.canvasRef.style.cursor = 'default';
    }

    // 每张图片的初始化配置
    initialConfigs = () => {
        // 清除画布
        this.clearCanvas()
        // 获取设备像素比
        this.ratio = imgFn.getPixelRatio(this.showImg)
        // 当前canvas绘制的图片实例
        this.imgBase = null; 
        // 图片自身压缩比例
        this.scale = null; 
        // 当前裁剪框的位置参数
        this.trimPosition = { 
            startX: null,
            startY: null,
            width: null,
            height: null
        }
        // 裁剪框移动时的临时位置参数
        this.tempPosition = {
            startX: null,
            startY: null,
            width: null,
            height: null
        }
        // 点击裁剪框时的鼠标位置参数
        this.movePosition = {
            moveStartX: null,
            moveStartY: null
        }
        // 裁剪框边框节点事件坐标
        this.borderArr = [];
        // 裁剪框边框节点直径
        this.borderSize = 10;
        // 裁剪框边框事件参数
        this.borderOption = null;
        // 判断canvas图层鼠标事件结束与否
        this.dragging = null;  
        // 判断裁剪框鼠标事件结束与否
        this.draggingTrim = null; 
        // 判断click事件的触发时机
        this.clickFlag = null;
    }

    // 接收图片, 初始化图片列表的信息
    receiveImg = () => {
        let { fileListArray, fileSelected } = this.state;
        // cdn
        this.uploadUrl = 'cdn链接';
        // 初始化裁剪图片列表信息
        this.trimInfoList = Array.apply(null, {length: fileListArray.length}).map(() => ({}));
        this.initialImage();
    };

    // 获取图片信息并初始绘制图片
    initialImage = () => {
        let { fileListArray, fileSelected } = this.state;
        let { canvasDefaultSize, configs } = this.props;
        this.spinRef.style.display = 'block';
        Promise.all(
            fileListArray.map((file, index) => {
                return imgFn.imageInfo(file, canvasDefaultSize, this.ratio, configs);
            })
        ).then(imageInfoArr => {
            this.spinRef.style.display = 'none';
            this.trimInfoList = imageInfoArr.slice(0);
            this.drawImage(imageInfoArr[fileSelected], fileSelected, this.canvasRef);
        });
    }

    // 绘制图片
    drawImage = (imageInfo, fileSelected, canvas) => {
        this.initialConfigs();
        if(!imageInfo) return;
        let { imgBase, scale, trimPosition, canvasWidth, canvasHeight } = imageInfo;
        // 绘制图片时给当前操作的参数赋值
        this.state.fileSelected = fileSelected;
        this.scale = scale;
        this.imgBase = imgBase;
        // 获取等比例缩放后的canvas宽高尺寸
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        canvas.style.width = canvasWidth / this.ratio + 'px';
        canvas.style.height = canvasHeight / this.ratio + 'px';
        // 如果有过裁剪记录
        if (trimPosition) {
            this.trimPosition = trimPosition;
            let { startX, startY, width, height } = this.trimPosition;
            this.drawTrim(startX, startY, width, height, this.showImg);
            // 保存相关裁剪信息
            this.saveTrimInfo(fileSelected)
            return
        } else {
            // 填进输入框
            this.setState({
                inputWidth: imgBase.width,
                inputHight: imgBase.height
            })
            // 尺寸校验
            let judgeText = imgFn.judgeData(this.props.configs, canvasWidth, canvasHeight, scale, this.ratio)
            this.trimInfoList[fileSelected].judgeText = judgeText;
            this.setState({
                judgeText
            })
        }
        // 绘制图片
        this.showImg.drawImage(imgBase, 0, 0, canvas.width, canvas.height);
    };

    // 切换canvas主图
    checkShowImg = (i) => {
        let { rotate } = this.trimInfoList[i];
        if (rotate % 360) {
            this.rotateDrawImage(this.trimInfoList[i], i, this.showImg, this.canvasRef, false, false)
        } else {
            this.drawImage(this.trimInfoList[i], i, this.canvasRef);
        }
    }

    // 删除图片
    closeShowImg = (i) => {
        // 加个动画
        let childFile = this.fileListRef.childNodes;
        childFile[i].className = "none";
        let { fileListArray, fileSelected } = this.state;
        // 删除图片列表的那一张
        fileListArray.splice(i, 1); 
        this.trimInfoList.splice(i, 1);
        // 如果刚好是选中的那一张
        if (fileSelected == i) {
            // 如果列表删完了
            if (!fileListArray.length) {
                this.initialConfigs();
                this.receiveImg();
                this.props.closeModal();
            } else {
                // 如果下一张有值
                if (this.trimInfoList[i]) {
                    this.drawImage(this.trimInfoList[i], i, this.canvasRef)
                } else {
                    fileSelected--
                    this.drawImage(this.trimInfoList[i-1], i-1, this.canvasRef)
                }
            }
        } else {
            // 如果删除的是选中图片之前的，需要修改fileSelected
            if (i < fileSelected) {
                fileSelected--
            }
        }
        setTimeout(() => {
            this.setState({
                fileListArray,
                fileSelected
            })
        }, 200)
    }

    // 绘制裁剪框
    drawTrim = (startX, startY, width, height, ctx) => {
        let { fileListArray, fileSelected } = this.state;
        // 每帧都要清除画布
        ctx.clearRect(0, 0, this.canvasRef.width, this.canvasRef.height);
        // 绘制蒙层
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, this.canvasRef.width, this.canvasRef.height);
        // 将裁剪框凿开
        ctx.globalCompositeOperation = 'source-atop';
        ctx.clearRect(startX, startY, width, height);
        // 绘制8个边框节点
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#fc178f';
        let size = this.borderSize; // 节点大小
        ctx.fillRect(startX - size / 2, startY - size / 2, size, size);
        ctx.fillRect(startX - size / 2 + width / 2, startY - size / 2, size, size);
        ctx.fillRect(startX - size / 2 + width, startY - size / 2, size, size);
        ctx.fillRect(startX - size / 2, startY - size / 2 + height / 2, size, size);
        ctx.fillRect(startX - size / 2 + width, startY - size / 2 + height / 2, size, size);
        ctx.fillRect(startX - size / 2, startY - size / 2 + height, size, size);
        ctx.fillRect(startX - size / 2 + width / 2, startY - size / 2 + height, size, size);
        ctx.fillRect(startX - size / 2 + width, startY - size / 2 + height, size, size);
        ctx.restore();
        // 绘制底图, 将图片绘制到蒙层下方
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        let { imgBase, scale, canvasWidth, canvasHeight, rotate} = this.trimInfoList[fileSelected];
        if ( rotate ) {
            if (rotate % 180 !== 0) {
                ctx.translate(canvasWidth / 2, canvasHeight / 2);
                ctx.rotate(rotate * Math.PI / 180);
                ctx.translate(-canvasHeight / 2, -canvasWidth / 2);
            } else {
                ctx.translate(canvasWidth / 2, canvasHeight / 2);
                ctx.rotate(rotate * Math.PI / 180);
                ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
            }
        }
        ctx.drawImage(this.imgBase, 0, 0, imgBase.width * scale * this.ratio, imgBase.height * scale * this.ratio);
        // 将截图框宽高临时保存, 其实是防止重复赋值
        this.tempPosition.startX = startX;
        this.tempPosition.startY = startY;
        this.tempPosition.width = width;
        this.tempPosition.height = height;
        ctx.restore();
        // 尺寸校验
        let judgeText = imgFn.judgeData(this.props.configs, width, height, scale, this.ratio)
        this.trimInfoList[fileSelected].judgeText = judgeText; // 靠下面的setState刷新render
        this.setState({
            judgeText
        })
    }

    // 操作裁剪框
    moveTrim = (currentX, currentY, startX, startY, width, height, ctx) => {
        let { moveStartX, moveStartY } = this.movePosition;
        if (this.borderArr.length && !this.draggingTrim) {
            let flag = false;
            //判断鼠标位置
            ctx.beginPath();
            for (var i = 0; i < this.borderArr.length; i++) {
                ctx.rect(this.borderArr[i].x, this.borderArr[i].y, this.borderArr[i].width, this.borderArr[i].height);
                if (ctx.isPointInPath(currentX, currentY)) {
                    switch (this.borderArr[i].index) {
                        case 1:
                            this.canvasRef.style.cursor = 'move'; break;
                        case 2:
                            this.canvasRef.style.cursor = 'ns-resize'; break;
                        case 3:
                            this.canvasRef.style.cursor = 'ew-resize'; break;
                        case 4:
                            this.canvasRef.style.cursor = 'nwse-resize'; break;
                        case 5:
                            this.canvasRef.style.cursor = 'nesw-resize'; break;
                        default:
                            break;
                    }
                    this.borderOption = this.borderArr[i].option;
                    flag = true;
                    break;
                }
            }
            ctx.closePath();
            if (!flag) {
                this.canvasRef.style.cursor = 'default';
                this.borderOption = null;
            }
        }
        // 正在操作裁剪框时
        if (this.draggingTrim) {
            if (this.borderOption == 1) {
                let x = imgFn.fixedData(currentX - (moveStartX - startX), width, this.canvasRef.width);
                let y = imgFn.fixedData(currentY - (moveStartY - startY), height, this.canvasRef.height);
                // move
                this.drawTrim(x, y, width, height, this.showImg); 
            } else {
                // 其他8个方向
                let { tempStartX, tempStartY, tempWidth, tempHeight } = imgFn.moveTrimPosition(currentX, currentY, startX, startY, width, height, this.borderOption);
                this.drawTrim(tempStartX, tempStartY, tempWidth, tempHeight, this.showImg);
            }
        }
    }

    // 保存相关裁剪信息
    saveTrimInfo = (i) => {
        // 将临时位置参数赋给当前裁剪框
        Object.keys(this.trimPosition).forEach(key => {
            this.trimPosition[key] = this.tempPosition[key]
        })
        // 转换拉开裁剪框时坐标为负时的情况
        imgFn.transformDot(this.trimPosition);
        // 保存裁剪边框的坐标
        imgFn.saveBorderArr(this.borderArr, this.borderSize, this.trimPosition);
        // 储存裁剪位置信息
        this.trimInfoList[i].trimPosition = this.trimPosition;
        // 填进输入框
        this.setState({
            inputWidth: imgFn.resetData(this.trimPosition.width, this.trimInfoList[i].scale, this.ratio),
            inputHight: imgFn.resetData(this.trimPosition.height, this.trimInfoList[i].scale, this.ratio)
        })
    }

    mouseDownEvent = (e) => {
        this.dragging = true;
        this.clickFlag = true;
        // 如果操作的是裁剪框
        if (this.borderOption) {
            this.draggingTrim = true;
            this.movePosition.moveStartX = imgFn.nonNegativeData(e.nativeEvent.offsetX * this.ratio);
            this.movePosition.moveStartY = imgFn.nonNegativeData(e.nativeEvent.offsetY * this.ratio);
        } else {
            // 保存当前鼠标开始坐标, 坐标都会乘以个像素比
            this.trimPosition.startX = imgFn.nonNegativeData(e.nativeEvent.offsetX * this.ratio);
            this.trimPosition.startY = imgFn.nonNegativeData(e.nativeEvent.offsetY * this.ratio);
        }
    }

    mouseMoveEvent = (e) => {
        this.clickFlag = false;
        // 当前裁剪框坐标
        let { startX, startY, width, height } = this.trimPosition;
        let { fileListArray, fileSelected } = this.state;
        // 当前坐标
        let currentX = imgFn.nonNegativeData(e.nativeEvent.offsetX * this.ratio),
            currentY = imgFn.nonNegativeData(e.nativeEvent.offsetY * this.ratio),
        // 制造临时裁剪框的宽高
            tempWidth = currentX - startX,
            tempHeight = currentY - startY;
        // 移入裁剪框的相关操作
        this.moveTrim(currentX, currentY, startX, startY, width, height, this.showImg)
        // 如果没有点击或者当前操作的是裁剪框都return
        if (!this.dragging || this.draggingTrim) return
        // 绘制裁剪框
        this.drawTrim(startX, startY, tempWidth, tempHeight, this.showImg)
    }

    mouseRemoveEvent = (e) => {
        let { fileListArray, fileSelected } = this.state;
        // 保存相关裁剪信息
        if (this.dragging) {
            this.saveTrimInfo(fileSelected)
        }
        this.dragging = false;
        this.draggingTrim = false
    }

    mouseClick = (e) => {
        if (this.clickFlag) {
            let { fileListArray, fileSelected } = this.state,
                { rotate } = this.trimInfoList[fileSelected];
            this.trimInfoList[fileSelected].trimPosition = null;
            if (rotate % 360) {
                this.rotateDrawImage(this.trimInfoList[fileSelected], fileSelected, this.showImg, this.canvasRef, false, false)
            } else {
                this.drawImage(this.trimInfoList[fileSelected], fileSelected, this.canvasRef);
            }
        }
    }

    // 输入裁剪
    inputDrawImage = (e, type) => {
        let { fileListArray, fileSelected } = this.state;
        let { imgBase, scale, canvasWidth, canvasHeight, trimPosition } = this.trimInfoList[fileSelected];
        let startX = trimPosition ? trimPosition.startX : 0,
            startY = trimPosition ? trimPosition.startY : 0,
            width = trimPosition ? trimPosition.width : canvasWidth,
            height = trimPosition ? trimPosition.height : canvasHeight;
        if (type == 'width') {
            let inputWidth = imgFn.inputData(e ? e : 0, 0, imgFn.resetData(canvasWidth, scale, this.ratio))
            this.setState({
                inputWidth
            }, () => {
                let tempWidth =  imgFn.canvasData(inputWidth, scale, this.ratio);
                let x = imgFn.fixedData(startX, tempWidth, canvasWidth);
                let y = imgFn.fixedData(startY, height, canvasHeight);
                // 绘制裁剪框
                this.drawTrim(x, y, tempWidth, height, this.showImg);
                // 保存相关裁剪信息
                this.saveTrimInfo(fileSelected)
            })
        } else if (type == 'hight') {
            let inputHight = imgFn.inputData(e ? e : 0, 0, imgFn.resetData(canvasHeight, scale, this.ratio))
            this.setState({
                inputHight
            }, () => {
                let tempHeight =  imgFn.canvasData(inputHight, scale, this.ratio);
                let x = imgFn.fixedData(startX, width, canvasWidth);
                let y = imgFn.fixedData(startY, tempHeight, canvasHeight);
                // 绘制裁剪框
                this.drawTrim(x, y, width, tempHeight, this.showImg);
                // 保存相关裁剪信息
                this.saveTrimInfo(fileSelected)
            })
        }
    }

    // 旋转绘制图片
    rotateDrawImage = (imageInfo, fileSelected, ctx, canvas, type, rotateFlag) => {
        // 旋转直角与平角时处理参数、方法不同
        let { imgBase, scale, rotate, canvasWidth, canvasHeight, trimPosition} = imageInfo;
        // 初始化当前参数
        this.initialConfigs();
        // 重新构造画布
        if (!type) {
            // 如果是当前canvas画布， 若rotateFlag为true，则还需旋转一遍，宽高交换
            canvas.width = rotateFlag ? canvasHeight : canvasWidth;
            canvas.height = rotateFlag ? canvasWidth : canvasHeight;
            canvas.style.width = (rotateFlag ? canvasHeight : canvasWidth) / this.ratio + 'px';
            canvas.style.height = (rotateFlag ? canvasWidth : canvasHeight) / this.ratio + 'px';
        } else {
            // 如果是中转canvas画布,由于之前已经转过一遍，则只需绘制，不用再转, 并且还需要还原成原始数据
            canvas.width = imgFn.resetData(canvasWidth, scale, this.ratio),
            canvas.height = imgFn.resetData(canvasHeight, scale, this.ratio),
            canvas.style.width = canvasWidth / this.ratio / this.ratio / scale + 'px';
            canvas.style.height = canvasHeight / this.ratio / this.ratio / scale + 'px';
        }
        ctx.save();
        if (rotate % 180 !== 0) {
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(rotate * Math.PI / 180);
            ctx.translate(-canvas.height / 2, -canvas.width / 2);
        } else {
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(rotate * Math.PI / 180);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
        }
        if (!type) {
            // 如果是当前canvas画布
            // 由于之前初始化当前参数，旋转之后重新保存
            this.scale = scale;
            this.imgBase = imgBase;
            this.state.fileSelected = fileSelected;
            // 保存对应图片的参数
            this.trimInfoList[fileSelected].rotate = rotate;
            this.trimInfoList[fileSelected].canvasWidth = canvas.width;
            this.trimInfoList[fileSelected].canvasHeight = canvas.height;
            // 如果有过裁剪记录 && 只是绘制
            if (trimPosition && !rotateFlag) {
                ctx.restore();
                this.trimPosition = trimPosition;
                let { startX, startY, width, height } = this.trimPosition;
                this.drawTrim(startX, startY, width, height, ctx);
                // 保存相关裁剪信息
                this.saveTrimInfo(fileSelected)
                return
            } else {
                // 填进输入框原始尺寸
                this.setState({
                    inputWidth: imgFn.resetData(rotateFlag ? canvasHeight : canvasWidth, scale, this.ratio),
                    inputHight: imgFn.resetData(rotateFlag ? canvasWidth : canvasHeight, scale, this.ratio)
                })
                // 尺寸校验
                let judgeText = imgFn.judgeData(this.props.configs, rotateFlag ? canvasHeight : canvasWidth, rotateFlag ? canvasWidth : canvasHeight, scale, this.ratio)
                this.trimInfoList[fileSelected].judgeText = judgeText;
                this.setState({
                    judgeText
                })
            }
            // 绘制图片(宽高始终不变)
            ctx.drawImage(
                imgBase, 0, 0, imgBase.width * scale * this.ratio, imgBase.height * scale * this.ratio
            );
        } else {
            // 如果是中转画布
            ctx.drawImage(
                imgBase, 0, 0, imgBase.width, imgBase.height
            );
        }
        ctx.restore();
    }

    rotateClick = () => {
        let { fileListArray, fileSelected } = this.state;
        // 旋转时取消对应图片保存的截图框数据，每次旋转90度
        this.trimInfoList[fileSelected].trimPosition = null;
        this.trimInfoList[fileSelected].rotate += 90;
        // 旋转绘制图片
        this.rotateDrawImage(this.trimInfoList[fileSelected], fileSelected, this.showImg, this.canvasRef, false, true)
    }

    // 尺寸优化
    optimalDrawImage = (i) => {
        if (i) {
            // 绘制图片时给当前操作的参数赋值
            this.state.fileSelected = i;
        }
        let { fileListArray, fileSelected } = this.state;
        let { imgBase, scale, canvasWidth, canvasHeight } = this.trimInfoList[fileSelected];
        // 尺寸优化规则
        let configs = {
            maxHeight: this.props.configs.maxHeight && this.props.configs.maxHeight.value,
            maxWidth: this.props.configs.maxWidth && this.props.configs.maxWidth.value,
            minHeight: this.props.configs.minHeight && this.props.configs.minHeight.value,
            minWidth: this.props.configs.minWidth && this.props.configs.minWidth.value
        }
        let optimalRatio = this.props.optimalRatio // 宽/高
        return new Promise((res, rej) => {
            this.canvasRef.width = canvasWidth;
            this.canvasRef.height = canvasHeight;
            this.canvasRef.style.width = canvasWidth / this.ratio + 'px';
            this.canvasRef.style.height = canvasHeight / this.ratio + 'px';
            let { RW, RH } = imgFn.optimalData(configs, optimalRatio, canvasWidth, canvasHeight, scale, this.ratio);
            let RX = imgFn.nonNegativeData((canvasWidth - RW) / 2);
            let RY = imgFn.nonNegativeData((canvasHeight - RH) / 2);
            // 一定要加这个，不然全部尺寸优化会有问题
            this.trimPosition = {
                width: RW,
                height: RH,
                startX: RX,
                startY: RY
            }
            res({RW, RH, RX, RY})
            // 保存当前信息
            this.scale = scale;
            this.imgBase = imgBase;
            // 绘制裁剪框
            this.drawTrim(RX, RY, RW, RH, this.showImg);
            // 保存相关裁剪信息
            this.saveTrimInfo(fileSelected)
        })
    }

    // 全部尺寸优化
    allOptimalDrawImage = () => {
        Promise.all(
            this.trimInfoList.map((imageInfo, i) => {
                return this.optimalDrawImage(i)
            })
        ).then((result) => {
            message.success('一键优化成功~');
            // 全部尺寸优化回调
            this.props.allOptimalCallback()
        })
    }

    // 获得裁剪后的图片文件
    getImgTrim = (imageInfo) => {
        this.checkShowImg(0);
        let { trimPosition, imgBase, type, scale, canvasWidth, canvasHeight, rotate } = imageInfo;
        return new Promise((res, rej) => {
            // 先构建一个和原来图片一样的canvas
            if (rotate % 360) {
                // 绘制旋转的图片
                this.rotateDrawImage(imageInfo, null, this.saveImg, this.saveCanvasRef, true, false)
            } else {
                // 正常绘制图片
                this.saveImg.clearRect(0, 0, this.saveCanvasRef.width, this.saveCanvasRef.height);
                this.saveCanvasRef.width = imgBase.width;
                this.saveCanvasRef.height = imgBase.height;
                this.saveCanvasRef.style.width = imgBase.width / this.ratio + 'px';
                this.saveCanvasRef.style.height =  imgBase.height / this.ratio + 'px';
                this.saveImg.save();
                this.saveImg.drawImage(imgBase, 0, 0, this.saveCanvasRef.width, this.saveCanvasRef.height);
                this.saveImg.restore();
            }
            // 然后将裁剪的位置坐标转换，在原图片尺寸的canvas上输入
            let startX = trimPosition ? trimPosition.startX : 0,
                startY = trimPosition ? trimPosition.startY : 0,
                width = trimPosition ? trimPosition.width : canvasWidth,
                height = trimPosition ? trimPosition.height : canvasHeight,
                resultStartX = imgFn.resetData(startX, scale, this.ratio),
                resultStartY = imgFn.resetData(startY, scale, this.ratio),
                resultWidth = imgFn.resetData(width, scale, this.ratio),
                resultHeight = imgFn.resetData(height, scale, this.ratio)
            let data = this.saveImg.getImageData(resultStartX, resultStartY, resultWidth, resultHeight);
            // 最后输出在第三个canvas上
            this.resultImg.clearRect(0, 0, this.resultCanvasRef.width, this.resultCanvasRef.height);
            // 获取等比例缩放后的canvas宽高尺寸
            this.resultCanvasRef.width = resultWidth;
            this.resultCanvasRef.height = resultHeight;
            this.resultCanvasRef.style.width = resultWidth / this.ratio + 'px';
            this.resultCanvasRef.style.height = resultHeight / this.ratio + 'px';
            this.resultImg.putImageData(data, 0, 0);
            this.resultCanvasRef.toBlob((blob)=>{
                // 加个时间戳缓存
                blob.lastModifiedDate = new Date();
                res(blob)
            }, type)
        })
    }

    // 批量尺寸校验
    batchJudgeImg = () => {
        let errArr = []
        this.trimInfoList.map((e, i) => {
            e.judgeText && errArr.push(i+1)
        })
        if (errArr.length) {
            errArr = errArr.toString();
            return errArr
        }
        return false
    }

    batchImgTrim = () => {
        this.spinRef.style.display = 'block';
        let failArr = [];
        return new Promise((res, rej) => {
            Promise.all(
                this.trimInfoList.map((imageInfo, i) => {
                    if (Object.keys(imageInfo).length) {
                        return this.getImgTrim(imageInfo)
                    }
                })
            ).then((blobArr) => {
                Promise.all(
                    blobArr.map((blob, index) => {
                        return imgFn.uploadImgs(this.uploadUrl, blob, index).catch(() => {failArr.push(index + 1); return false})
                    })
                ).then((linkArr) => {
                    linkArr = linkArr.filter(e => e);
                    if (failArr.length) {
                        failArr.sort((a,b) => a - b);
                        message.warn(`服务器开小差了～，第${failArr.toString()}张上传失败`)
                    } else {
                        message.success('上传成功~');
                    }
                    this.initialConfigs();
                    this.receiveImg();
                    this.spinRef.style.display = 'none';
                    res(linkArr)
                }).catch(() => {
                    this.initialConfigs();
                    this.receiveImg();
                    message.error('服务器开小差了～上传失败')
                    this.spinRef.style.display = 'none';
                    this.props.closeModal();
                })
            });
        })
    }

    render() {
        const { canvasDefaultSize, optimalCallback } = this.props;
        const { fileListArray, fileSelected, inputWidth, inputHight, judgeText } = this.state;
        return (
            <div className="trimModal">
                <div 
                    className="ant-modal-mask" 
                    style={{ position : 'absolute', display: 'none' }} 
                    ref={e => {
                        this.spinRef = e;
                    }}>
                    <div className="spin">
                        <Spin/> 正在上传图片～
                    </div>
                </div>
                <div className="modal-err">
                    {judgeText}
                </div>
                <div 
                    className="modal-trim"
                    style={{ width: `${canvasDefaultSize}px`, height: `${canvasDefaultSize}px` }}    
                >
                    <canvas
                        ref={e => {
                            this.canvasRef = e;
                        }}
                        width={canvasDefaultSize}
                        height={canvasDefaultSize}
                        onMouseDown={(e) => this.mouseDownEvent(e)}
                        onMouseMove={(e) => this.mouseMoveEvent(e)}
                        onMouseUp={(e) => this.mouseRemoveEvent(e)}
                        onMouseOut={e => this.mouseRemoveEvent(e)}
                        onClick={(e) => this.mouseClick(e)}
                    ></canvas>
                </div>
                <div className="modal-input">
                    <span className="text">尺寸(px):</span>
                    <span className="text">宽</span>
                    <InputNumber 
                        min={0} 
                        value={inputWidth}
                        onChange={(e) => this.inputDrawImage(e, 'width')} 
                    />
                    <span className='text'>~</span>
                    <span className="text">高</span>
                    <InputNumber
                        min={0}
                        value={inputHight}
                        onChange={(e) => this.inputDrawImage(e, 'hight')}
                    />
                </div>
                <div className="modal-option">
                    <Button type="primary" onClick={() => this.rotateClick()}>旋转</Button>
                    <Button type="primary" onClick={() => {this.optimalDrawImage(); optimalCallback()}}>尺寸优化</Button>
                    <Button type="primary" onClick={() => this.allOptimalDrawImage()}>全部尺寸优化</Button>
                </div>
                <div 
                    ref={e => {
                        this.fileListRef = e;
                    }}
                    className="modal-fileList"
                    style={fileListArray.length && fileListArray.length < 9 ? {'justifyContent' : 'center'} : {}}
                >
                    {
                        fileListArray.length ? fileListArray.map((e, i) => {
                            return (
                                <div 
                                    key={e.link}
                                >
                                    <Icon onClick={(e) => {this.closeShowImg(i); e.stopPropagation();}} className="close" type="close-circle"/>
                                    <div 
                                        className="modal-file" 
                                        style={ fileSelected == i ? { border: `2px solid #ff476b` } : {} }
                                        onClick={() => this.checkShowImg(i)}
                                    >
                                        <img className="file" src={e.link} />
                                        {
                                            this.trimInfoList && this.trimInfoList[i].judgeText ?
                                                <Icon type="exclamation-circle" className="err"/> : null
                                        }
                                    </div>
                                </div>
                            )
                        }) : null
                    }
                </div>
                <canvas
                    ref={e => {
                        this.saveCanvasRef = e;
                    }}
                    style={{ display: "none" }}
                ></canvas>
                <canvas
                    ref={e => {
                        this.resultCanvasRef = e;
                    }}
                    style={{ display: "none" }}
                ></canvas>
            </div>
        );
    }
}

export default ImgTrim;
