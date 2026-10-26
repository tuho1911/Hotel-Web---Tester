import React, { useEffect, useState } from 'react';
import { App, Button, Form, Input, Rate } from 'antd';
import { reviewApi, ReviewDto } from '../../services/reviewApi';
import { UserCircle } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface ReviewSectionProps {
  targetType: 'Article' | 'Attraction';
  targetId: number;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({ targetType, targetId }) => {
  const { message } = App.useApp();
  const { user } = useSelector((state: RootState) => state.auth);
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [average, setAverage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchReviews = async () => {
    try {
      const data = await reviewApi.getReviews(targetType, targetId);
      setReviews(data.reviews);
      setAverage(data.averageRating);
      setTotal(data.totalReviews);
    } catch (err) {
      console.error('Failed to load reviews');
    }
  };

  useEffect(() => {
    void fetchReviews();
  }, [targetType, targetId]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await reviewApi.createReview({
        targetType,
        targetId,
        rating: values.rating,
        comment: values.comment,
        guestName: !user ? values.guestName : undefined
      });
      message.success('Cảm ơn bạn đã đánh giá! Đánh giá đã được đăng thành công.');
      form.resetFields();
      void fetchReviews();
    } catch (err) {
      message.error('Gửi đánh giá thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-12 bg-[var(--card-bg)] border border-luxury rounded-2xl p-6 md:p-8">
      <div className="flex items-center gap-4 border-b border-luxury pb-6 mb-6">
        <h3 className="text-2xl font-bold font-display text-title">Đánh giá & Bình luận</h3>
        <div className="flex items-center gap-2 bg-warning/10 px-3 py-1 rounded-full text-warning font-bold">
          ⭐ {average.toFixed(1)} <span className="text-sm font-normal text-muted">({total})</span>
        </div>
      </div>

      <div className="space-y-6 max-h-96 overflow-y-auto custom-scrollbar pr-2 mb-8">
        {reviews.length === 0 ? (
          <p className="text-muted italic">Chưa có bình luận nào. Hãy là người đầu tiên đánh giá!</p>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="flex gap-4">
              <div className="w-10 h-10 shrink-0 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <UserCircle size={24} />
              </div>
              <div className="bg-subtle rounded-2xl rounded-tl-none p-4 w-full border border-luxury/50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-title">{review.authorName}</p>
                    <p className="text-xs text-muted">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <Rate disabled defaultValue={review.rating} className="text-sm text-warning" />
                </div>
                <p className="text-body mt-2 leading-relaxed whitespace-pre-line">{review.comment}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-subtle p-6 rounded-xl border border-luxury">
        <h4 className="font-bold text-lg text-title mb-4">Viết đánh giá của bạn</h4>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {!user && (
            <Form.Item name="guestName" label={<span className="text-muted font-semibold">Tên của bạn</span>} rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}>
              <Input placeholder="Nguyễn Văn A" className="input-luxury" />
            </Form.Item>
          )}
          
          <Form.Item name="rating" label={<span className="text-muted font-semibold">Số điểm</span>} rules={[{ required: true, message: 'Vui lòng chọn số sao!' }]} initialValue={5}>
            <Rate className="text-warning text-xl" />
          </Form.Item>
          
          <Form.Item name="comment" label={<span className="text-muted font-semibold">Cảm nghĩ của bạn</span>}>
            <Input.TextArea rows={4} placeholder="Chia sẻ trải nghiệm..." className="input-luxury" />
          </Form.Item>
          
          <Button type="primary" htmlType="submit" loading={loading} className="btn-gold px-12 h-12 shadow-lg shadow-primary/20">
            Gửi đánh giá
          </Button>
        </Form>
      </div>
    </div>
  );
};

export default ReviewSection;
