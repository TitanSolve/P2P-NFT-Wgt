import React, { useState } from "react";
import nft_pic from "../../assets/nft.png";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-coverflow";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Modal, Select, Dropdown, Menu, Input, Button, Switch, Typography, Space } from "antd";
import { DownOutlined, UserOutlined } from "@ant-design/icons";

const { Text } = Typography;

const ParticipantCard = ({ title, nfts, index, own }) => {
  const [state, setState] = useState({
    sortOrder: "newest",
    isModalOpen: false,
    isSell: true,
    isOldest: true,
    selectedUser: "Alice @rPdshidjjore",
    amount: "",
    token: "XRP"
  });

  const sortedNFTs = [...nfts].sort((a, b) =>
    state.sortOrder === "newest" ? b.id - a.id : a.id - b.id
  );

  const toggleModal = () => setState(prev => ({ ...prev, isModalOpen: !prev.isModalOpen }));

  const toggleSortOrder = () => setState(prev => ({ ...prev, isOldest: !prev.isOldest }));

  const toggleSellMode = () => setState(prev => ({ ...prev, isSell: !prev.isSell }));

  const updateField = (field, value) => setState(prev => ({ ...prev, [field]: value }));

  const userMenu = (
    <Menu onClick={(e) => updateField('selectedUser', e.key)}>
      {["Alice @rPdshidjjore", "Bob @xTysidjjqwe", "Cevin @xTysidjjqwe", "David @xTysidjjqwe"].map(user => (
        <Menu.Item key={user}>
          <Space>
            <UserOutlined />
            {user}
          </Space>
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <>
      <div className="p-4 border border-gray-200 rounded-2xl bg-white shadow-lg w-full max-w-5xl">
        <div className="flex items-center justify-between">
          <h2 className="text-1xl font-bold text-gray-900">{title}</h2>
          <Select
            className="w-24"
            value={state.token}
            onChange={(value) => updateField('token', value)}
            size="large"
          >
            <Select.Option value="issuer">issuer</Select.Option>
          </Select>
          <div className="flex items-center gap-4">
            <Text strong className={state.isOldest ? "text-black" : "text-gray-400"}>Oldest</Text>
            <Switch
              checked={!state.isOldest}
              onChange={toggleSortOrder}
              checkedChildren="Newest"
              unCheckedChildren="Oldest"
              className="bg-gray-300"
            />
            <Text strong className={!state.isOldest ? "text-black" : "text-gray-400"}>Newest</Text>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 space-x-4">
          <button className={`swiper-button-prev-${index} bg-gray-800 hover:bg-gray-700 text-white p-1 rounded-full shadow-lg transform transition-all duration-300 ease-in-out hover:scale-110 focus:outline-none`}>
            <ChevronLeft size={30} />
          </button>
          <Swiper
            spaceBetween={10}
            slidesPerView={4}
            navigation={{ nextEl: `.swiper-button-next-${index}`, prevEl: `.swiper-button-prev-${index}` }}
            pagination={{ clickable: true }}
            modules={[Navigation, Pagination]}
            className="rounded-lg overflow-hidden shadow-xl"
          >
            {sortedNFTs.map((nft) => (
              <SwiperSlide key={nft.id}>
                <div className="transform hover:scale-105 transition-transform duration-300 border p-2 rounded-lg shadow-md bg-gradient-to-r from-blue-200 to-purple-300 text-gray-800 font-semibold text-center cursor-pointer">
                  <img src={nft_pic} alt="nft" className="rounded-t-lg" onClick={toggleModal} />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
          <button className={`swiper-button-next-${index} bg-gray-800 hover:bg-gray-700 text-white p-1 rounded-full shadow-lg transform transition-all duration-300 ease-in-out hover:scale-110 focus:outline-none`}>
            <ChevronRight size={30} />
          </button>
        </div>
      </div>

      <Modal
        open={state.isModalOpen}
        onCancel={toggleModal}
        footer={null}
        centered
        closable={false}
        maskClosable={true}
        bodyStyle={{
          borderRadius: '10px',
        }}
        style={{ maxWidth: '400px' }}
      >
        <div>
          <img
            src={nft_pic || "/placeholder-image.jpg"}
            alt="NFT"
            className="w-32 h-32 object-cover rounded-md mx-auto mb-3 shadow-lg"
          />

          {!own && (
            <div className="mb-3 flex justify-center">
              <Text strong className="text-black text-center">Offer to buy from Bob</Text>
            </div>
          )}

          {own && (
            <div>
              <div className="flex justify-center items-center gap-4 mb-3">
                <Text strong className={state.isSell ? "text-black" : "text-gray-400"}>Sell</Text>
                <Switch
                  checked={!state.isSell}
                  onChange={toggleSellMode}
                  checkedChildren="Transfer"
                  unCheckedChildren="Sell"
                  className="bg-gray-300"
                />
                <Text strong className={!state.isSell ? "text-black" : "text-gray-400"}>Transfer</Text>
              </div>
              <Dropdown overlay={userMenu} trigger={["click"]} className="mb-3">
                <Button block size="large">
                  <Space>
                    {state.selectedUser}
                    <DownOutlined />
                  </Space>
                </Button>
              </Dropdown>
            </div>
          )}

          {state.isSell && (
            <div className="flex gap-2 w-full mb-4">
              <Input
                type="number"
                placeholder="Amount"
                value={state.amount}
                onChange={(e) => updateField('amount', e.target.value)}
                size="large"
                className="border rounded"
              />
              <Select
                className="w-24"
                value={state.token}
                onChange={(value) => updateField('token', value)}
                size="large"
              >
                <Select.Option value="XRP">XRP</Select.Option>
                <Select.Option value="TokenA">TokenA</Select.Option>
                <Select.Option value="TokenB">TokenB</Select.Option>
              </Select>
            </div>
          )}

          <div className="flex justify-center">
            <Button
              type="primary"
              block
              size="large"
              onClick={() => console.log(state.isSell ? "Selling NFT" : "Transferring NFT")}
              style={{ borderRadius: "6px", width: "30%", alignItems: "center" }}
            >
              {state.isSell ? (!own ? "Offer Buy" : "Offer Sell") : "Transfer"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ParticipantCard;
