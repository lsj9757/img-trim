import React from 'react';
import PropTypes from 'prop-types';
import './index.less';
import imgFn from './util';
import ImgTrimModal from './imgTrim';
import { Modal, message, notification } from 'antd';
import 'antd/lib/modal/style/index';
import 'antd/lib/message/style/index';
import 'antd/lib/notification/style/index';

class IndexPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            visible: false,
            fileListArray: [],
            // 配置参数
            coverImg: props.coverImg,
            coverColor: props.coverColor,
            coverWidth: props.coverWidth,
            coverHight: props.coverHight,
            multiple: !props.single,
            canvasDefaultSize: props.canvasDefaultSize,
            confirmCallback: props.confirmCallback,
            cancelCallback: props.cancelCallback,
            optimalRatio: props.optimalRatio,
            fileLinkArray: props.fileLinkArray,
            hiddenCover: props.hiddenCover,
            imgTrimFlag: props.imgTrimFlag,
            fileSelected: props.fileSelected,
            localUpload: props.localUpload,
            optimalCallback: props.optimalCallback,
            allOptimalCallback: props.allOptimalCallback,
            configs: {   
                filetype: props.configs.filetype || {
                    value: 'png|jpg|jpeg',
                    message: '图片格式有误;',
                },
                filesize: props.configs.filesize || {
                    value: 20971520,
                    message: '图片超出大小限制;',
                },
                max: props.configs.max || {
                    value: Infinity,
                    message: '',
                },
                min: props.configs.max || {
                    value: 1,
                    message: '最少上传1张图片; ', 
                },
                adviceFilesize: props.configs.adviceFilesize,
                adviceFiletype: props.configs.adviceFiletype,
                maxHeight: props.configs.maxHeight || {
                    value: Infinity,
                    message: '',
                },
                maxWidth: props.configs.maxWidth || {
                    value: Infinity,
                    message: '',
                },
                minHeight: props.configs.minHeight || {
                    value: 0,
                    message: '图片最小高度为0px',
                },
                minWidth: props.configs.minWidth || {
                    value: 0,
                    message: '图片最小宽度为0px',
                },
                maxRatio: props.configs.maxRatio,
                minRatio: props.configs.minRatio
            }
        };
    }

    static propTypes = {
        // 上传图标图
        coverImg: PropTypes.string,
        // 上传图标背景色
        coverColor: PropTypes.string,
        // 上传图标宽度
        coverWidth: PropTypes.number,
        // 上传图标高度
        coverHight: PropTypes.number,
        // 是否单传
        single: PropTypes.bool,
        // canvas画布大小
        canvasDefaultSize: PropTypes.number,
        // 尺寸优化比例(宽/高)
        optimalRatio: PropTypes.number,
        // 图片规则
        configs: PropTypes.object,
        // 确认回调
        confirmCallback: PropTypes.func,
        // 取消回调
        cancelCallback: PropTypes.func,
        // 默认图片上传路径(编辑时使用)
        fileLinkArray: PropTypes.array,
        // 隐藏入口
        hiddenCover: PropTypes.bool,
        // 裁剪框显示开关
        imgTrimFlag: PropTypes.bool,
        // 默认打开第几张图片(从0开始)
        fileSelected: PropTypes.number,
        // 选择是否不经过裁剪上传(本地直接上传)
        localUpload: PropTypes.bool,
        // 尺寸优化回调
        optimalCallback: PropTypes.func,
        // 全部尺寸优化回调
        allOptimalCallback: PropTypes.func
    };

    static defaultProps = {
        coverImg: 'https://s10.mogucdn.com/mlcdn/c45406/191118_02b7e17364e2difi6ec9di56kg14d_100x100.png',
        coverColor: '#fafafa',
        coverWidth: 102,
        coverHight: 102,
        single: false,
        canvasDefaultSize: 300,
        optimalRatio: 0.75, 
        confirmCallback: function(linkArr) {
            console.log('默认函数：', linkArr)
        },
        cancelCallback: new Function(),
        fileLinkArray: [],
        hiddenCover: false,
        fileSelected: 0,
        localUpload: false,
        imgTrimFlag: false,
        optimalCallback: new Function(),
        allOptimalCallback: new Function()
    };

    componentDidMount() {
        const { fileLinkArray } = this.state;
        if (fileLinkArray.length) {
            this.readFilesInfo(fileLinkArray, true);
        }
    }

    componentWillReceiveProps(props) {
        this.props = props;
        Object.keys(this.props).forEach(key => {
            if (key != 'configs') {
                this.state[key] = this.props[key]
            }
        })
        const { fileLinkArray, imgTrimFlag } = this.state;
        if (imgTrimFlag && fileLinkArray.length) {
            this.readFilesInfo(fileLinkArray, true);
        }
    }

    // 上传图片
    handleChange = (e) => {
        const { configs, localUpload } = this.state;
        const files = Array.from(e.target.files);
        if (!files.length) {
            // 释放系统存储当前值，避免相同文件不触发onchange事件
            this.imageUpload.value = null;
            return;
        }
        // 上传校验
        const validateRes = imgFn.validate(files, configs);
        if (!validateRes.flag) {
            message.error(validateRes.message + ` 请修改后再上传图片~`, 4)
            this.imageUpload.value = null;
            return;
        }
        // 建议校验
        const adviceValidateRes = imgFn.adviceValidate(files, configs);
        if (!adviceValidateRes.flag && !localUpload) {
            let alertText = ''
            if (adviceValidateRes.typeArr.length) {
                alertText = alertText.concat(`为了浏览体验，您的第${adviceValidateRes.typeArr.toString()}张图片建议换成${configs.adviceFiletype.value}格式图片;`);
            } 
            if (adviceValidateRes.sizeArr.length) {
                let size = Math.round(configs.adviceFilesize.value/1024/1024);
                alertText = alertText.concat(`您的第${adviceValidateRes.sizeArr.toString()}张图片大于${size}M，建议保持在${size}M以内;`);
            }
            alertText && notification.warning({
                message: alertText,
            });
        }
        if (localUpload) {
            let failArr = [];
            message.loading('正在上传图片～', 100);
            // 本地直接上传
            Promise.all(
                files.map((file, index) => {
                    return imgFn.uploadImgs('cdn链接', file, index).catch(() => {failArr.push(index + 1); return false})
                })
            ).then((linkArr) => {
                message.destroy();
                linkArr = linkArr.filter(e => e);
                if (failArr.length) {
                    failArr.sort((a,b) => a - b);
                    message.warn(`服务器开小差了～，第${failArr.toString()}张上传失败`)
                } else {
                    message.success('上传成功~');
                }
                this.state.confirmCallback(linkArr); // 外部确认回调
            }).catch(() => {
                message.destroy();
                message.error('服务器开小差了～上传失败')
            })
        } else {
            message.loading('正在上传图片～', 100);
            this.readFilesInfo(files);
        }
        this.imageUpload.value = null;
    };

    // 获取所有图片原始信息
    readFilesInfo = (files, type) => {
        type && message.loading('正在打开图片～', 100);
        Promise.all(
            files.map(e => {
                return type ? imgFn.linkInfo(e) : imgFn.filesInfo(e);
            })
        ).then(fileListArray => {
            this.setState({
                fileListArray
            }, () => {
                    message.destroy();
                    // 打开裁剪框
                    this.setState({
                        visible: true,
                    });
                }
            );
        });
    };

    closeModal = () => {
        this.setState({
            visible: false,
        });
    };

    cancelClick = () => {
        this.state.cancelCallback() // 外部取消回调
        this.closeModal()
    };

    confirmClick = () => {
        let errArr = this.imgTrim.batchJudgeImg()
        if (errArr) {
            message.error(`第${errArr}张不符合裁剪尺寸要求～`);
            return;
        }
        this.imgTrim.batchImgTrim().then((linkArr) => {
            if (linkArr) {
                this.state.confirmCallback(linkArr); // 外部确认回调
            }
            this.closeModal();
        })
    };

    render() {
        const { fileLinkArray, fileSelected, visible, fileListArray, hiddenCover, multiple, coverImg, coverColor, coverWidth, coverHight, canvasDefaultSize, optimalRatio, configs, optimalCallback, allOptimalCallback } = this.state;
        let acceptStr = '';
        if (configs.filetype && configs.filetype.value) {
          const filetypeArr = configs.filetype.value.split('|');
          let accept = filetypeArr.map(item => `image/${item}`);
          acceptStr = accept.join(',');
        } else {
          acceptStr = 'image/*';
        }
        return (
            <div 
                className="my_component_upload"
                style={ hiddenCover || fileLinkArray.length ? { display: 'none', backgroundColor: coverColor, width: `${coverWidth}px`, height: `${coverHight}px`} : { backgroundColor : coverColor, width: `${coverWidth}px`, height: `${coverHight}px` } }
            >
                <div className="upload-btn">
                    <input
                        className="upload-input"
                        type="file"
                        onChange={this.handleChange}
                        multiple={multiple}
                        accept={acceptStr}
                        ref={e => {
                            this.imageUpload = e;
                        }}
                    />
                    <img className="upload-img" src={coverImg} />
                </div>
                <Modal
                    width={!multiple ? "500px" : "750px"}
                    style={{ top: '20px' }}
                    title="图片编辑"
                    visible={visible}
                    onOk={this.confirmClick}
                    // confirmLoading={confirmLoading}
                    onCancel={this.cancelClick}
                >
                    <ImgTrimModal
                        ref={e => {
                            this.imgTrim = e;
                        }}
                        canvasDefaultSize={canvasDefaultSize}
                        optimalRatio={optimalRatio}
                        configs={configs}
                        fileListArray={fileListArray} 
                        fileSelected={fileSelected}
                        closeModal={this.closeModal}
                        optimalCallback={optimalCallback}
                        allOptimalCallback={allOptimalCallback}
                    />
                </Modal>
            </div>
        );
    }
}

export default IndexPage;
