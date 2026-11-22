export interface RecommendedYoutubeChannel {
  name: string;
  handle: string;
  description: string;
  searchUrl: string;
}

const TOPIC_CHANNEL_MAP: Array<{
  keywords: RegExp;
  channels: RecommendedYoutubeChannel[];
}> = [
  {
    keywords: /\b(ai|artificial intelligence|machine learning|deep learning|neural network|llm|nlp|gpt|transformer|computer vision)\b/i,
    channels: [
      {
        name: '3Blue1Brown',
        handle: '@3blue1brown',
        description: 'Visual neural networks, linear algebra, and backpropagation mechanics.',
        searchUrl: 'https://www.youtube.com/results?search_query=3blue1brown+neural+networks',
      },
      {
        name: 'StatQuest with Josh Starmer',
        handle: '@statquest',
        description: 'Clear, step-by-step intuition for machine learning algorithms and math.',
        searchUrl: 'https://www.youtube.com/results?search_query=statquest+machine+learning',
      },
      {
        name: 'Andrej Karpathy',
        handle: '@AndrejKarpathy',
        description: 'Deep neural networks from scratch and foundational AI architecture.',
        searchUrl: 'https://www.youtube.com/results?search_query=andrej+karpathy+neural+networks',
      },
      {
        name: 'freeCodeCamp',
        handle: '@freecodecamp',
        description: 'Comprehensive end-to-end Machine Learning and Deep Learning bootcamps.',
        searchUrl: 'https://www.youtube.com/results?search_query=freecodecamp+machine+learning',
      },
    ],
  },
  {
    keywords: /\b(python|django|fastapi|flask|pandas|numpy)\b/i,
    channels: [
      {
        name: 'Corey Schafer',
        handle: '@coreyms',
        description: 'Industry-standard Python tutorials, virtualenvs, OOP, and data science.',
        searchUrl: 'https://www.youtube.com/results?search_query=corey+schafer+python',
      },
      {
        name: 'Tech With Tim',
        handle: '@TechWithTim',
        description: 'Practical Python programming projects, game development, and APIs.',
        searchUrl: 'https://www.youtube.com/results?search_query=tech+with+tim+python',
      },
      {
        name: 'freeCodeCamp',
        handle: '@freecodecamp',
        description: 'Complete Python beginner to advanced developer certifications.',
        searchUrl: 'https://www.youtube.com/results?search_query=freecodecamp+python',
      },
    ],
  },
  {
    keywords: /\b(web|javascript|typescript|react|nextjs|html|css|tailwind|node)\b/i,
    channels: [
      {
        name: 'Fireship',
        handle: '@Fireship',
        description: 'Fast, high-density web tech overviews and 100-second architectural tours.',
        searchUrl: 'https://www.youtube.com/results?search_query=fireship+web+dev',
      },
      {
        name: 'Web Dev Simplified',
        handle: '@WebDevSimplified',
        description: 'Clear frontend hooks, React design patterns, and CSS mastery.',
        searchUrl: 'https://www.youtube.com/results?search_query=web+dev+simplified+react',
      },
      {
        name: 'Kevin Powell',
        handle: '@KevinPowell',
        description: 'The king of CSS: Flexbox, CSS Grid, responsiveness, and modern layouts.',
        searchUrl: 'https://www.youtube.com/results?search_query=kevin+powell+css',
      },
    ],
  },
  {
    keywords: /\b(math|calculus|algebra|geometry|trigonometry|discrete math|probability)\b/i,
    channels: [
      {
        name: '3Blue1Brown',
        handle: '@3blue1brown',
        description: 'Essence of Calculus, Linear Algebra, and geometry animated with Manim.',
        searchUrl: 'https://www.youtube.com/results?search_query=3blue1brown+calculus',
      },
      {
        name: 'Professor Leonard',
        handle: '@ProfessorLeonard',
        description: 'Full-length university-grade lectures in Calculus I-III and Statistics.',
        searchUrl: 'https://www.youtube.com/results?search_query=professor+leonard+calculus',
      },
      {
        name: 'Khan Academy',
        handle: '@khanacademy',
        description: 'Intuitive foundation mastery with step-by-step solved examples.',
        searchUrl: 'https://www.youtube.com/results?search_query=khan+academy+math',
      },
    ],
  },
  {
    keywords: /\b(data science|sql|data analysis|powerbi|tableau)\b/i,
    channels: [
      {
        name: 'Alex The Analyst',
        handle: '@AlexTheAnalyst',
        description: 'Real-world data analytics portfolios, SQL queries, Excel, and Power BI.',
        searchUrl: 'https://www.youtube.com/results?search_query=alex+the+analyst+sql',
      },
      {
        name: 'Luke Barousse',
        handle: '@LukeBarousse',
        description: 'Data analytics career roadmaps and python visualization techniques.',
        searchUrl: 'https://www.youtube.com/results?search_query=luke+barousse+data+analysis',
      },
      {
        name: 'Ken Jee',
        handle: '@KenJee_ds',
        description: 'Practical data science projects, portfolios, and Kaggle walkthroughs.',
        searchUrl: 'https://www.youtube.com/results?search_query=ken+jee+data+science',
      },
    ],
  },
  {
    keywords: /\b(design|ui|ux|figma|product design)\b/i,
    channels: [
      {
        name: 'Mizko',
        handle: '@mizko',
        description: 'Professional Figma design systems, UX frameworks, and client projects.',
        searchUrl: 'https://www.youtube.com/results?search_query=mizko+figma',
      },
      {
        name: 'Flux Academy',
        handle: '@FluxAcademy',
        description: 'High-end web design, typography, spacing, and UX strategy.',
        searchUrl: 'https://www.youtube.com/results?search_query=flux+academy+ui+design',
      },
    ],
  },
];

const DEFAULT_CHANNELS: RecommendedYoutubeChannel[] = [
  {
    name: 'CrashCourse',
    handle: '@crashcourse',
    description: 'Fast-paced, high-production educational video courses across all subjects.',
    searchUrl: 'https://www.youtube.com/results?search_query=crash+course+education',
  },
  {
    name: 'Khan Academy',
    handle: '@khanacademy',
    description: 'Trusted masterclasses in STEM, economics, humanities, and test prep.',
    searchUrl: 'https://www.youtube.com/results?search_query=khan+academy',
  },
  {
    name: 'MIT OpenCourseWare',
    handle: '@mitocw',
    description: 'Full university lecture series from MIT faculty across all academic fields.',
    searchUrl: 'https://www.youtube.com/results?search_query=mit+opencourseware',
  },
];

export function getRecommendedChannelsForTopic(topic: string): RecommendedYoutubeChannel[] {
  if (!topic || topic.trim() === '') return DEFAULT_CHANNELS;
  for (const entry of TOPIC_CHANNEL_MAP) {
    if (entry.keywords.test(topic)) {
      return entry.channels;
    }
  }
  return DEFAULT_CHANNELS;
}

export function buildQuestSpecificRoadmap(questTitle: string, subjectCategory: string = 'General'): Array<{ step: number; title: string; objective: string }> {
  const cleanTitle = questTitle.trim() || 'Study Topic';
  return [
    {
      step: 1,
      title: `Core Foundations: ${cleanTitle}`,
      objective: `Understand key definitions, core mechanics, and why ${cleanTitle} matters in ${subjectCategory}.`,
    },
    {
      step: 2,
      title: `Hands-on Practice & Analysis`,
      objective: `Work through 2 to 3 real-world exercises, code snippets, or case studies on ${cleanTitle}.`,
    },
    {
      step: 3,
      title: `Active Recall & Revision`,
      objective: `Summarize the takeaway in your StudyDuo notes and ask Bujji 1 follow-up question to test retention.`,
    },
  ];
}
