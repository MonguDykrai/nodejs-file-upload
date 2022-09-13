import React, {useEffect, useRef, useState} from "react";
import {observer} from "mobx-react";
import styles from "./index.scss";
import {Button, message, Modal, Table, Space, Spin} from 'antd';
import Query from "./query";
import {ColumnsType} from "antd/lib/table";
import {apiDeleteUpgradePackage, apiUpgradeList, apiUploadUpgradePackage} from "@/common/apis/upgrade";
import {ExclamationCircleOutlined} from "@ant-design/icons";
import request from "@/common/request";
import axios from "axios";

const UpgradeManager = observer(() => {
  const data = useRef<any>();
  const worker = useRef<any>();
  const hash = useRef<any>();
  const file = useRef<any>();
  const [loading, setLoading] = useState(false)
  const [params, setParams] = useState<any>({page: 1, size: 20})
  const [pageResponse, setPageResponse] = useState<any>({})

  useEffect(() => {
    setLoading(true)
    apiUpgradeList(params).then(res => {
      if (res.code === 0) {
        setPageResponse(res)
      }
    }).finally(() => setLoading(false))
  }, [params])

  const columns: ColumnsType<any> = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      align: 'center'
    },
    {
      title: "升级包",
      dataIndex: "upgradePackageName",
      key: "upgradePackageName",
      align: 'center'
    },
    {
      title: "产品类型",
      dataIndex: "type",
      key: "type",
      align: 'center'
    },
    {
      title: "系统软件版本",
      dataIndex: "softwareVersion",
      key: "softwareVersion",
      align: 'center'
    },
    {
      title: "SDK版本号",
      dataIndex: "sdkSoftwareVersion",
      key: "sdkSoftwareVersion",
      align: 'center'
    },
    {
      title: "文件大小",
      dataIndex: "fileSize",
      key: "fileSize",
      align: 'center',
      render: (text: any, record: any) => {
        return (text ? text + 'M' : '')
      }
    },
    {
      title: "上传时间",
      dataIndex: "createTime",
      key: "createTime",
      align: 'center'
    },
    {
      title: "操作",
      dataIndex: "operation",
      key: "operation",
      align: "center",
      render: (text: any, record: any) => {
        return (
          <Button
            type={'link'}
            onClick={() => {
              showDeleteConfirm([record.id]);
            }}>
            删除
          </Button>
        )
      }
    }
  ];

  const showDeleteConfirm = (ids: number[]) => {
    Modal.confirm({
      title: "确认删除已选中的记录吗？",
      content: '删除的记录不能恢复,请谨慎操作!',
      icon: <ExclamationCircleOutlined/>,
      onOk() {
        apiDeleteUpgradePackage({ids: ids}).then(res => {
          if (res?.code === 0) {
            message.success("删除成功")
            setParams({...params, ...{page: 1}});
          }
        })
      }
    });
  };

  const onQueryCallBack = (values: any) => {
    const {size} = params;
    const page = 1;
    setParams({...values, ...{page, size}});
  };

  const renderToolBar = () => (
    <Space size={10}>
      <Button type="primary" onClick={() => {
        debugger
      }}>
        上传升级包
      </Button>
    </Space>
  )

  const handleFileChange = (e: any) => {
    // console.log(e);
    // console.log(e.target.files);
    const [__file] = e.target.files;
    if (__file) {
      file.current = __file;
    }    
  };

  const calculateHash = (fileChunkList: any) => {
    console.log("calculateHash");
    
    return new Promise(resolve => {
        // 添加 worker 属性
        worker.current = new Worker("/child/admin/hash.js");
        worker.current.postMessage({ fileChunkList });
        worker.current.onmessage = (e: any) => {
          console.log(e.data);
          
          const { hash } = e.data;
          if (hash) {
            console.log(hash, 333);
            
            resolve(hash);
          }
       };
     });

  };

  const createFileChunk = (file: any, size = 1 * 1024 * 1024) => {
    // const createFileChunk = (file: any, size = 10 * 1024 * 1024) => {
    const fileChunkList = [];
    let cur = 0;
    while(cur < file.size) {
      fileChunkList.push({ file: file.slice(cur, cur + size) })
      cur += size;
    }
    return fileChunkList;
  };

  const uploadChunks = async () => {
    const hashCurrent = hash.current;
    
    const requestList = data.current
	    .map((li: any) => {
        // .map(({ chunk, hash }: { chunk: any, hash: any }) => {
        const { chunk, hash } = li;
        console.log(li);
        
        console.log(chunk);
        console.log(hash);
        
        console.log(hashCurrent);
        
        
	      const formData = new FormData();
	      formData.append("chunk", chunk);
	      formData.append("hash", hash);
	      formData.append("filehash", hashCurrent);
	      return { formData };
	    })
	    .map(async ({ formData }: { formData: any }) => {
         return formData;
          console.log(formData);
        
          // request({
          //   url: "http://localhost:3000",
          //   data: formData
          // });
          return axios({
            method: "POST",
            url: "http://localhost:3000/server",
            data: formData,
          });
        }
	    );
	  // await Promise.all(requestList); // 并发切片

    // data.current = null;
    // worker.current = null;
    // hash.current = null;
    // file.current = null;

    while(requestList.length) {
      const formData = requestList[0];
      const value = await queueRequest(formData);
      console.log(value);
      debugger;
    }
  }

  const queueRequest = (formData: any) => {
    return new Promise((resolve, reject) => {
      apiUploadUpgradePackage(formData).then(response => {
        resolve(formData);
      }).catch(error => {
        reject(error);
      });
    });
  };

  // const request1 = () => {
  //   return new Promise((resolve) => {
  //     resolve()
  //   });
  // };

  const handleUpload = async () => {
    console.log("handleUpload");
    
      if (!file.current) return;
      const fileChunkList = createFileChunk(file.current);
      hash.current = await calculateHash(fileChunkList);
      console.log(hash.current, 9999);
      
      data.current = fileChunkList.map(({ file }, index) => {
        console.log(file, 'file');
        
        return ({
          chunk: file,
          hash: hash.current + "-" + index // hash + 数组下标
        });
      });
      console.log(data.current, 919191);
      console.log(hash.current, 23232323);
      
      await uploadChunks();
  };

  // chunk1 // ajax
  // chunk2 // ajax
  // chunk3 // ajax

  // chunk1 // ajax =>
  // chunk2 // ajax =>
  // chunk3

  return (
    <div className={styles.upgradeManagerContainer}>
      <Spin spinning={loading}>

        <Query onQueryCallBack={onQueryCallBack}/>

        <input type="file" onChange={handleFileChange} />

        <button onClick={handleUpload}>上传</button>

        <div className={styles.listContainer}>
          <div className={styles.toolBar}>
            {renderToolBar()}
          </div>

          <Table
            rowKey={"id"}
            dataSource={pageResponse.data}
            columns={columns}
            pagination={{
              current: pageResponse.pageInfo?.page || 0,
              pageSize: pageResponse.pageInfo?.size || 20,
              showQuickJumper: true,
              showLessItems: true,
              showSizeChanger: true,
              hideOnSinglePage: true,
              pageSizeOptions: ["20", "30", "50"],
              total: pageResponse.pageInfo?.total || 0,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, size) => {
                setParams({...params, ...{page, size}})
              }
            }}
          />
        </div>
      </Spin>
    </div>
  )
});

export default UpgradeManager
