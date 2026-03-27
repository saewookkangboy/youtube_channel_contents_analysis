export interface YouTubeVideoData {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  channelTitle: string;
  tags: string[];
  views: string;
  likes: string;
  comments: string;
}

export async function fetchYouTubeVideoData(url: string, apiKey: string): Promise<YouTubeVideoData> {
  if (!apiKey) {
    throw new Error('YouTube API 키가 없습니다.');
  }

  let videoId = '';
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')) {
      videoId = urlObj.searchParams.get('v') || '';
    } else if (urlObj.hostname.includes('youtu.be')) {
      videoId = urlObj.pathname.slice(1);
    }
  } catch (e) {
    // If URL parsing fails, try to extract it manually
    if (url.includes('v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    }
  }

  if (!videoId) {
    throw new Error('URL에서 영상 ID를 찾을 수 없습니다.');
  }

  const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`);
  if (!response.ok) throw new Error('영상 정보를 가져오지 못했습니다.');
  
  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    throw new Error('해당 영상을 찾을 수 없습니다.');
  }

  const item = data.items[0];
  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    publishedAt: item.snippet.publishedAt,
    channelTitle: item.snippet.channelTitle,
    tags: item.snippet.tags || [],
    views: item.statistics.viewCount || "0",
    likes: item.statistics.likeCount || "0",
    comments: item.statistics.commentCount || "0",
  };
}

export interface YouTubeChannelData {
  channelName: string;
  subscriberCount: string;
  totalViews: string;
  videoCount: string;
  recentVideos: {
    title: string;
    publishedAt: string;
    views: string;
    likes: string;
    comments: string;
  }[];
}

export async function fetchYouTubeChannelData(url: string, apiKey: string): Promise<YouTubeChannelData> {
  if (!apiKey) {
    throw new Error('YouTube API 키가 없습니다.');
  }

  let channelId = '';
  let handle = '';

  // 1. Extract handle or channel ID from URL
  if (url.includes('/channel/')) {
    channelId = url.split('/channel/')[1].split('/')[0].split('?')[0];
  } else if (url.includes('/@')) {
    handle = url.split('/@')[1].split('/')[0].split('?')[0];
  } else if (url.includes('/c/')) {
    handle = url.split('/c/')[1].split('/')[0].split('?')[0];
  }

  // 2. Resolve handle to Channel ID if necessary
  if (!channelId && handle) {
    const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=%40${handle}&key=${apiKey}`);
    if (!searchRes.ok) throw new Error('채널 핸들 검색에 실패했습니다.');
    const searchData = await searchRes.json();
    if (searchData.items && searchData.items.length > 0) {
      channelId = searchData.items[0].snippet.channelId;
    }
  }

  if (!channelId) {
    throw new Error('URL에서 채널 ID를 확인할 수 없습니다.');
  }

  // 3. Fetch Channel Statistics and Uploads Playlist ID
  const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,contentDetails,snippet&id=${channelId}&key=${apiKey}`);
  if (!channelRes.ok) throw new Error('채널 정보를 가져오지 못했습니다.');
  const channelData = await channelRes.json();
  
  if (!channelData.items || channelData.items.length === 0) {
    throw new Error('해당 채널을 찾을 수 없습니다.');
  }

  const channel = channelData.items[0];
  const stats = channel.statistics;
  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
  const channelName = channel.snippet.title;

  const result: YouTubeChannelData = {
    channelName,
    subscriberCount: stats.subscriberCount || '비공개',
    totalViews: stats.viewCount || "0",
    videoCount: stats.videoCount || "0",
    recentVideos: []
  };

  // 4. Fetch Recent Videos from Uploads Playlist
  if (uploadsPlaylistId) {
    const playlistRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=5&key=${apiKey}`);
    if (playlistRes.ok) {
      const playlistData = await playlistRes.json();
      if (playlistData.items && playlistData.items.length > 0) {
        const videoIds = playlistData.items.map((item: any) => item.snippet.resourceId.videoId).join(',');
        
        // 5. Fetch Video Statistics
        const videosRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`);
        if (videosRes.ok) {
          const videosData = await videosRes.json();
          result.recentVideos = videosData.items.map((v: any) => ({
            title: v.snippet.title,
            publishedAt: v.snippet.publishedAt,
            views: v.statistics.viewCount || "0",
            likes: v.statistics.likeCount || "0",
            comments: v.statistics.commentCount || "0"
          }));
        }
      }
    }
  }

  return result;
}
