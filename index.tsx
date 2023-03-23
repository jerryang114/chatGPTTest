import IPageProps from '@/base/interfaces/IPageProps';
import Module from '@/components/Moudle';
import PageContent from '@/components/PageContent';
import { InfoCircleFilled, UploadOutlined } from '@ant-design/icons';
import {
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  message,
  Modal,
  Radio,
  Row,
  Spin,
  Tabs,
  Upload,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
// import DocumentViewer from "./components/DocumentViewer";
import { Global } from '@/base/global';
// import { useTable } from '@/hooks/useTable';
import ClueRecordModal from '@/components/ClueRecordModal';
import { clueHandleRecord, getClueDetail } from '@/services/ClueManagement';
import {
  applyRequest,
  getApplyOrg,
} from '@/services/DataResourceApplyListService';
import { deleteDoc, getFJList, saveFile } from '@/services/TestService';
import moment from 'moment';
import 'moment/locale/zh-cn';
import PDFViewer from './components/PDFViewer';
import styles from './index.less';

interface IApplyOrg {
  applyDepartment?: string; // 部门
  applyOrg?: string; // 单位
  applyTime?: string | null; // 申请时间
  applyUserName?: string; // 申请人
}

interface IDetail {
  /** 文本域默认值 */
  textAreaValue?: string;
  /** 状态 */
  status?: string;
  /** 线索名称 */
  name?: string;
  /** 线索类型 */
  typeDesc?: string;
  /** 所属区域 */
  areaName?: string;
  /** 推送时间 */
  timeStr?: string;
  /** 类别 */
  /** 移办单位 */
  orgName?: string;
  /** 状态中文 */
  statusDesc?: string;
  /** 受理日期 */
  acceptDateStr?: string;
  clueId: string;
  xszy?: string;
  remark?: string;
  clueRecordData?: any;
  // setclueRecordData?: (params: any) => void;
  caseNo?: string;
  filingTime?: any;
}

/**
 * 线索办理
 */
function DataResourceApplyDetail(props: IPageProps) {
  const { id } = props.match?.params;
  const [IDetail, setIDetail] = useState<IDetail>({
    name: '',
    typeDesc: '',
    areaName: '',
    timeStr: '',
    xszy: '',
    remark: '',
    status: '',
    acceptDateStr: '',
    clueId: '',
    caseNo: '',
    filingTime: '',
  });

  const {
    name,
    typeDesc,
    timeStr,
    xszy,
    remark,
    status,
    acceptDateStr,
    clueId,
    // setclueRecordData,
    caseNo,
    filingTime,
  } = IDetail;
  type TargetKey = React.MouseEvent | React.KeyboardEvent | string;
  const [ClueRecordVisble, setClueRecordVisble] = useState(false);
  const history = useHistory();
  const [form] = Form.useForm();
  const [saveLoading, setSaveLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [radioBtnMoke, setRadioBtnMoke] = useState([
    {
      name: '初步核实',
      isClick: true,
      value: '03',
    },
    {
      name: '立案监督',
      isClick: false,
      value: '04',
    },
    {
      name: '暂存待查',
      isClick: false,
      value: '05',
    },
    {
      name: '予以了结',
      isClick: false,
      value: '06',
    },
  ]);
  const [valueType, setValuType] = useState('01');
  const [documentLoading, setDocumentLoading] = useState(false);
  const [defaultActiveKey, setDefaultActiveKey] = useState('');
  const [visible, setVisible] = useState(false);
  const [clueRecordData, setClueRecordData] = useState({
    statusDesc: '',
    curOrgName: '',
    curUserName: '',
    handleDateStr: '',
    remark: '',
    dataList: [],
    pagination: {
      page: 1,
      pageSize: 5,
      total: 0,
    },
    tableLoading: false,
  });

  useEffect(() => {
    getLeadDetail();
    initData();
  }, []);

  // 获取线索详情
  const getLeadDetail = () => {
    getClueDetail(id).then((res: any) => {
      if (res.httpError) {
        message.error(res.message);
      } else {
        const messageList = res.data.data;
        // setClueRecordData(messageList.clueRecordData);
        setIDetail(messageList);
      }
    });
  };

  // 是否显示线索记录弹框
  const showClueRecordOpenOrClose = (visible: boolean) => {
    setClueRecordVisble(visible);
  };
  /** 初始化一些数据 */
  const initData = () => {
    // console.log("analyse", status);
    if (status === '04') {
      setValuType(status);
    }
    setLoading(true);
    getApplyOrg()
      .then((res: any) => {
        const detail: IApplyOrg = res?.data?.data || {};
        const { applyDepartment, applyOrg, applyTime, applyUserName } = detail;
        form.setFieldsValue({
          applyOrg,
          applyUserName,
          applyDepartment,
          applyTime: applyTime ? applyTime : moment().format('YYYY-MM-DD'),
        });
        // console.log("getApplyOrg ok", res);
      })
      .finally(() => {
        setLoading(false);
      });
    getFJListByClueId();
  };

  /** 获取上传的附件 */
  const getFJListByClueId = (type: string = 'init') => {
    getFJList(id)
      .then((res: any) => {
        const documentList = res?.data?.data || [];
        console.log('documentList', documentList);

        if (documentList && documentList.length > 0) {
          setDocument(documentList);
          if (type === 'init') {
            setDefaultActiveKey(String(documentList[0].id)); // 默认选中第一个
          } else if (type === 'add') {
            setDefaultActiveKey(
              String(documentList[documentList.length - 1].id)
            ); // 默认选中最后一个
          }
        } else {
          setDocument([]);
        }
      })
      .finally(() => {
        setDocumentLoading(false);
      });
  };

  // 线索处置记录列表
  const clueRecordGetTableList = (page: number, pageSize: number) => {
    clueRecordData.pagination.page = page;
    clueRecordData.pagination.pageSize = pageSize;
    clueHandleRecord1({
      clueId: id,
      page: clueRecordData.pagination.page,
      pageSize: clueRecordData.pagination.pageSize,
    });
  };
  // 线索处置记录
  const clueHandleRecord1 = (params: any) => {
    clueRecordData.tableLoading = true;
    clueHandleRecord(params).then((res: any) => {
      const { data: dataList, length: total } = res.data.data;
      clueRecordData.dataList = dataList;
      clueRecordData.pagination.total = total;
      clueRecordData.tableLoading = false;

      setClueRecordData({ ...clueRecordData });

      console.log('线索处置记录 ok', clueRecordData);
    });
  };

  /** 上传状态改变的回调 */
  const uploadChange = ({ file }: any) => {
    if (file.status === 'done') {
      // const { data: fileId } = file?.response || {};
      if (Global.successCode.includes(file?.response?.code)) {
        message.success(file?.response?.msg);
        // 保存附件
        saveFile({
          clueId: id,
          enclosureName: file.response.data.name,
          url: file.response.data.path,
        })
          .then((res: any) => {
            if (Global.successCode.includes(res?.data?.code)) {
              // 重新获取文书列表
              getFJListByClueId('add');
            }
            // console.log('res', res)
          })
          .catch(() => {
            setDocumentLoading(false);
          });
      } else {
        setDocumentLoading(false);
      }
      // console.log("文件上传ok", file);
    } else if (file.status === 'error') {
      message.error('上传失败!');
      setDocumentLoading(false);
    } else {
      if (file.status) {
        setDocumentLoading(true);
        // console.log("上传中~~~", file.status);
      }
    }
  };

  // 上传后的附件删除 附件只能上传一个
  const onFJFileRemove = () => {
    form.setFieldsValue({
      enclosure: null,
      enclosureName: null,
    });
  };
  const goBack = () => history.goBack();
  const onFinish = (values: any) => {
    setSaveLoading(true);
    let newValues: any = {};
    Object.keys(values).forEach((key: string) => {
      if (
        key !== 'applyTime' &&
        key !== 'applyDepartment' &&
        key !== 'applyOrg' &&
        key !== 'applyUserName' &&
        key !== 'filingTime'
      ) {
        newValues[key] = values[key];
      }
    });
    newValues = {
      ...newValues,
      id: id,
      filingTime: moment(values.filingTime).format('YYYY-MM-DD'),
    };
    console.log('values', newValues);

    applyRequest(newValues)
      .then((res: any) => {
        console.log('res', res);
        setSaveLoading(false);
        if (Global.successCode.includes(res?.data?.code)) {
          message.success(res?.data?.msg || Global.successMsg);
          goBack();
        }
      })
      .catch(() => {
        setSaveLoading(false);
      });
  };

  const [documentList, setDocument] = useState([] as any);
  const remove = (targetKey: any) => {
    deleteDoc([targetKey]).then((res: any) => {
      if (Global.successCode.includes(res?.data?.code)) {
        message.success(res?.data?.msg || Global.successMsg);
        setDocumentLoading(true);
        getFJListByClueId('add');
      }
    });
    // console.log("targetKey", targetKey);
  };

  /** 弹框关闭的回调 */
  const handleOpenOrCancel = (visible: boolean) => {
    setVisible(visible);
  };

  /** 弹框确认的回调 */
  const handleOk = () => {
    remove(defaultActiveKey);
    handleOpenOrCancel(false);
  };
  return (
    <PageContent
      style={{ backgroundColor: '#fff', padding: '40px 40px', marginTop: 0 }}
    >
      <Spin spinning={loading}>
        <Row className={styles.Content} gutter={[40, 0]}>
          <Col className={styles.Left} span={12}>
            <Form
              form={form}
              labelCol={{ style: { width: 94 } }}
              autoComplete="off"
              onFinish={onFinish}
            >
              <Form.Item noStyle>
                <Module moduleTitle="线索办理情况">
                  <section slot="Content" style={{ marginTop: 18 }}>
                    <Button
                      className={styles.clueHandleRecord}
                      onClick={() => showClueRecordOpenOrClose(true)}
                    >
                      线索处置记录
                    </Button>
                    <Form.Item label="线索名称">
                      <div dangerouslySetInnerHTML={{ __html: name || '' }} />
                    </Form.Item>
                    <Form.Item label="线索摘要" name="xszy" initialValue={xszy}>
                      <Input.TextArea
                        autoSize={{ minRows: 8, maxRows: 8 }}
                        value={xszy}
                        readOnly
                      />
                    </Form.Item>
                    <Row>
                      <Col span={8}>
                        <Form.Item label="线索来源">
                          <Input
                            bordered={false}
                            readOnly
                            defaultValue={'系统智能推送'}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="线索发现时间">
                          <Input
                            bordered={false}
                            readOnly
                            defaultValue={timeStr}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="线索受理日期">
                          <Input
                            bordered={false}
                            readOnly
                            defaultValue={acceptDateStr}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item
                      label="线索核查情况："
                      name="remark"
                      initialValue={remark}
                    >
                      <Input.TextArea autoSize={{ minRows: 8, maxRows: 8 }} />
                    </Form.Item>
                    <Form.Item
                      label="审批结果"
                      className={styles.radioBtnMoke}
                      name="status"
                      initialValue={status}
                    >
                      <Row>
                        <Radio.Group defaultValue={status}>
                          {radioBtnMoke.map((item: any, index: number) => (
                            <Radio.Button
                              key={index}
                              className={styles.RadioBtn}
                              onClick={() => {
                                // let lastActiveIndex: number = -1;
                                // radioBtnMoke.some(
                                //   (item: any, index2: number) => {
                                //     if (item.isClick) {
                                //       lastActiveIndex = index2;
                                //       return true;
                                //     }
                                //     return false;
                                //   }
                                // );
                                // if (
                                //   lastActiveIndex !== -1 &&
                                //   lastActiveIndex !== index
                                // ) {
                                //   radioBtnMoke[lastActiveIndex].isClick = false;
                                // }
                                // radioBtnMoke[index].isClick =
                                //   !radioBtnMoke[index].isClick;
                                // const currentIndex = radioBtnMoke[index].isClick
                                //   ? index
                                //   : -1;
                                // setRadioBtnMoke([...radioBtnMoke]);
                                setValuType(item.value);
                              }}
                              value={item.value}
                            >
                              {item.name}
                            </Radio.Button>
                          ))}
                        </Radio.Group>
                      </Row>
                    </Form.Item>
                    {valueType === '04' && (
                      <Row>
                        <Col span={16}>
                          <Form.Item
                            labelCol={{ style: { width: 94 } }}
                            label="统一受案号"
                            name="caseNo"
                            rules={[
                              { required: true, message: '请输入统一受案号' },
                            ]}
                            initialValue={caseNo}
                          >
                            <Input
                              style={{ width: 390 }}
                              defaultValue={caseNo}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item label="立案时间" name="filingTime">
                            {/* <Input
                                bordered={false}
                                readOnly
                                defaultValue={moment().format("YYYY-MM-DD")}
                              /> */}
                            {filingTime && filingTime !== '' ? (
                              <DatePicker
                                picker="date"
                                defaultValue={moment(filingTime, 'YYYY-MM-DD')}
                                style={{ width: 130 }}
                              />
                            ) : (
                              <DatePicker
                                picker="date"
                                style={{ width: 130 }}
                              />
                            )}
                          </Form.Item>
                        </Col>
                      </Row>
                    )}

                    <Row style={{ marginTop: 10 }}>
                      <Col span={8}>
                        <Form.Item
                          labelCol={{ style: { width: 94 } }}
                          label="申请单位"
                          name="applyOrg"
                        >
                          <Input bordered={false} readOnly />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="申请部门" name="applyDepartment">
                          <Input bordered={false} readOnly />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="申请人" name="applyUserName">
                          <Input bordered={false} readOnly />
                        </Form.Item>
                      </Col>
                    </Row>
                    {/* <Row style={{ marginTop: 10 }}>
                        <Col span={8}>
                          <Form.Item labelCol={{ style: { width: 94 } }} label="申请时间" name="applyTime">
                            <Input bordered={false} readOnly />
                          </Form.Item>
                        </Col>
                      </Row> */}
                  </section>
                </Module>
              </Form.Item>
            </Form>
            <Row justify="center">
              <Button type="primary" onClick={goBack}>
                返回
              </Button>
              <Button
                type="primary"
                loading={saveLoading}
                onClick={() => form.submit()}
                style={{ marginLeft: 24 }}
              >
                提交
              </Button>
            </Row>
          </Col>
          <Col className={styles.Right} span={12}>
            <Module moduleTitle="线索关联文书">
              <section slot="Content">
                {documentList && documentList.length > 0 ? (
                  <div className={styles.documentTab}>
                    <Button
                      className={styles.documentBt2}
                      onClick={(e: any) => {
                        // remove(defaultActiveKey)
                        handleOpenOrCancel(true);
                        e.stopPropagation();
                      }}
                    >
                      删除文件
                    </Button>
                    <Upload
                      name="file"
                      className={styles.documentBt1}
                      action={`${Global.url}/fileUpload/manual4Single`}
                      // fileList={fjList}
                      maxCount={1}
                      showUploadList={false}
                      onChange={uploadChange}
                      // onRemove={onFJFileRemove}
                    >
                      <Button icon={<UploadOutlined />}>上传文件</Button>
                    </Upload>
                    <Tabs
                      tabPosition={'right'}
                      onEdit={(
                        targetKey:
                          | React.MouseEvent
                          | React.KeyboardEvent
                          | string,
                        action: 'add' | 'remove'
                      ) => {
                        if (action === 'add') {
                        } else {
                        }
                      }}
                      activeKey={defaultActiveKey}
                      items={documentList.map((item: any) => {
                        return {
                          label: (
                            <div
                              className={styles.label}
                              title={item.enclosureName}
                            >
                              <span title={item.enclosureName}>
                                {item.enclosureName}
                              </span>
                            </div>
                          ),
                          key: String(item.id),
                          children: documentLoading ? (
                            <Row
                              style={{ width: '100%', height: '100%' }}
                              align="middle"
                              justify="center"
                            >
                              <Spin />
                            </Row>
                          ) : String(item.id) === defaultActiveKey ? (
                            <PDFViewer
                              file={`${Global.url}/fileUpload/getFileByte/${item.pathBase}`}
                            />
                          ) : null,
                        };
                      })}
                      onChange={(activeKey: string) => {
                        setDefaultActiveKey(activeKey);
                      }}
                    />
                  </div>
                ) : (
                  <div className={styles.documentContent}>
                    <Upload
                      name="file"
                      className={styles.documentBt}
                      action={`${Global.url}/fileUpload/manual4Single`}
                      // fileList={fjList}
                      maxCount={1}
                      showUploadList={false}
                      onChange={uploadChange}
                      // onRemove={onFJFileRemove}
                    >
                      <Button icon={<UploadOutlined />}>上传文件</Button>
                    </Upload>
                  </div>
                )}
              </section>
            </Module>
          </Col>
        </Row>
      </Spin>
      <ClueRecordModal
        key="privateLendingClueRecordModal"
        visible={ClueRecordVisble}
        clueName={name}
        caseType={typeDesc}
        publishTime={timeStr}
        onConfirm={() => showClueRecordOpenOrClose(false)}
        onCancel={() => showClueRecordOpenOrClose(false)}
        getTableListFunc={clueRecordGetTableList}
        dataList={clueRecordData.dataList}
        pagination={clueRecordData.pagination}
        tableLoading={clueRecordData.tableLoading}
      />
      <Modal
        open={visible}
        title="提示"
        width={435}
        centered
        className={styles.Modal}
        onOk={handleOk}
        onCancel={() => {
          handleOpenOrCancel(false);
        }}
      >
        <div className={styles.Content}>
          <InfoCircleFilled className={styles.Alert} />
          <span className={styles.RunText}>是否确认删除文件？</span>
        </div>
      </Modal>
    </PageContent>
  );
}

export default DataResourceApplyDetail;
