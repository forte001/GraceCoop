import React, { useEffect, useState } from "react";
import axiosMemberInstance from "../../utils/axiosMemberInstance";
import Spinner from "../../components/Spinner";


const MemberAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState([]);

  const toggleExpand = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };
  

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await axiosMemberInstance.get("/members/notice/announcements/");
        setAnnouncements(res.data.results);
      } catch (err) {
        console.error("Error fetching announcements:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  if (loading) return <Spinner />;

  return (
        <div className="member-announcements">
        <h2>Announcements</h2>
        <div className="announcement-list">
            {announcements.length === 0 ? (
            <p>No active announcements found.</p>
            ) : (
            <ul>
                {announcements.slice(0, 10).map((ann) => {
                const isExpanded = expandedIds.includes(ann.id);
                const displayText =
                    isExpanded || ann.message.length <= 100
                    ? ann.message
                    : ann.message.slice(0, 100) + "...";
                return (
                    <li key={ann.id} className="announcement-item">
                    <h4>{ann.title}</h4>
                    <p>
                        {displayText}{" "}
                        {ann.message.length > 100 && (
                        <button
                            onClick={() => toggleExpand(ann.id)}
                            className="read-more-button"
                        >
                            {isExpanded ? "Show less" : "Read more"}
                        </button>
                        )}
                    </p>
                    </li>
                );
                })}
            </ul>
            )}
        </div>
        </div>


  );
};

export default MemberAnnouncements;
