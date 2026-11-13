import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import { Page, Container, Card, Button, Typography, Icon, Badge, Input, Divider, Data, Flow, TreeView, ProgressBar } from '@components/Components';

const FIRST_PROMPT_KEY = 'ai-base-first-prompt';

const node = (id, label, column, row, color, shape = 'rectangle') => ({
    id, type: 'editable', position: { x: column * 220, y: row * 100 }, data: { label, color, shape }
});
const edge = (source, target, label) => ({ id: `${source}-${target}`, source, target, label, type: 'smoothstep' });

const DEMOS = [
    {
        id: 'table',
        icon: 'FiGrid',
        chip: 'Compare options',
        prompt: 'Compare three laptops for a student: price, weight and battery life.',
        reply: 'Here are three that fit a student budget. The Air is the lightest; the Vivobook is the cheapest.',
        render: () => (
            <Data
                size="xs"
                width="100%"
                variant="table"
                sortable={false}
                searchable={false}
                filterable={false}
                paginated={false}
                data={[
                    { laptop: 'Vivobook 15', price: '$549', weight: '1.7 kg', battery: '8 hours' },
                    { laptop: 'IdeaPad Slim 5', price: '$699', weight: '1.5 kg', battery: '11 hours' },
                    { laptop: 'MacBook Air', price: '$999', weight: '1.2 kg', battery: '15 hours' }
                ]}
            />
        )
    },
    {
        id: 'diagram',
        icon: 'FiGitBranch',
        chip: 'Draw a process',
        prompt: 'Draw how an online order gets from checkout to the customer.',
        reply: 'The order is checked for payment first. A refused payment ends the flow early.',
        render: () => (
            <Flow
                height="280px"
                connectable={false}
                deletable={false}
                enableNodeCreation={false}
                nodes={[
                    node('placed', 'Order placed', 0, 0, 'primary'),
                    node('paid', 'Payment OK?', 1, 0, 'warning', 'diamond'),
                    node('packed', 'Packed', 2, 0, 'secondary'),
                    node('sent', 'Delivered', 3, 0, 'success', 'circle'),
                    node('refused', 'Refused', 2, 1, 'error')
                ]}
                edges={[edge('placed', 'paid'), edge('paid', 'packed', 'yes'), edge('packed', 'sent'), edge('paid', 'refused', 'no')]}
            />
        )
    },
    {
        id: 'tree',
        icon: 'FiFolder',
        chip: 'Plan a structure',
        prompt: 'Lay out the folders for a small company website.',
        reply: 'Pages live in one folder, shared pieces in another, and pictures stay out of the code.',
        render: () => (
            <TreeView
                size="sm"
                data={{
                    website: {
                        label: 'website',
                        children: {
                            pages: { label: 'pages', children: { 'home.html': { label: 'home.html', children: {} }, 'about.html': { label: 'about.html', children: {} }, 'contact.html': { label: 'contact.html', children: {} } } },
                            parts: { label: 'parts', children: { 'header.html': { label: 'header.html', children: {} }, 'footer.html': { label: 'footer.html', children: {} } } },
                            images: { label: 'images', children: {} },
                            'styles.css': { label: 'styles.css', children: {} }
                        }
                    }
                }}
            />
        )
    },
    {
        id: 'status',
        icon: 'FiBarChart2',
        chip: 'Track progress',
        prompt: 'Show where the spring launch stands as a small dashboard.',
        reply: 'Design is done, the site is most of the way there, and testing has only just started.',
        render: () => (
            <Container layout="grid" columns={3} gap="sm" padding="none" width="100%">
                {[['Design', 100, 'success', 'Done'], ['Website', 70, 'primary', 'On track'], ['Testing', 15, 'warning', 'Just started']].map(([title, value, color, state]) => (
                    <Card key={title} layout="flex-column" gap="xs" padding="sm" hover={false} shadow={false} minWidth="0">
                        <Container layout="flex" justify="between" align="center" padding="none" width="100%" wrap={false}>
                            <Typography size="xs" weight="semibold">{title}</Typography>
                            <Badge size="xs" color={color}>{state}</Badge>
                        </Container>
                        <Typography size="xl" weight="bold" font="monospace">{value}%</Typography>
                        <ProgressBar value={value} size="sm" color={color} width="100%" />
                    </Card>
                ))}
            </Container>
        )
    }
];

const PROOF = [
    { icon: 'FiLock', title: 'Stays on this computer', text: 'Replies are written by a model on your own hardware.' },
    { icon: 'FiBox', title: 'Any Ollama model', text: 'Pick from a short list that fits your graphics card.' },
    { icon: 'FiHardDrive', title: 'Your files, one account', text: 'Sign in once and reach your FilesystemOne files.' }
];

const BENTO = [
    { icon: 'FiMessageSquare', title: 'Chat that keeps going', text: 'Close the tab and the reply carries on. Queue the next question while one is being written. Dictate instead of typing.', span: 2 },
    { icon: 'FiSliders', title: 'Knows what fits', text: 'Every model is checked against your graphics card and memory before you download it.' },
    { icon: 'FiFileText', title: 'Reads your documents', text: 'PDF, Word and spreadsheets, attached or picked from your files.' },
    { icon: 'FiSearch', title: 'Checks its links', text: 'Web search opens the pages and test-loads every file before a model may show it.' },
    { icon: 'FiUser', title: 'Models with your rules built in', text: 'Give any installed model a name, instructions and a temperament, and change them whenever you like.' }
];

const STEPS = [
    ['Install Ollama', 'One installer. AI Base finds it by itself.'],
    ['Pick a model', 'Choose from the ones that fit and press Download.'],
    ['Ask', 'Open Chat and type. Nothing to configure first.']
];

const Band = ({ children, width = '1120px', ...rest }) => (
    <Container layout="flex" justify="center" padding="none" width="100%" wrap={false} {...rest}>
        <Container layout="flex-column" gap="md" padding="lg" width="100%" maxWidth={width} wrap={false}>{children}</Container>
    </Container>
);

const HomePage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [demo, setDemo] = useState(DEMOS[0]);
    const [prompt, setPrompt] = useState(DEMOS[0].prompt);
    const start = user ? '/chat' : '/signup';

    const choose = (item) => {
        setDemo(item);
        setPrompt(item.prompt);
    };
    const send = () => {
        try {
            sessionStorage.setItem(FIRST_PROMPT_KEY, prompt.trim());
        } catch {
            return navigate(start);
        }
        return navigate(start);
    };

    return (
        <Page layout="block" padding="none" background="grid" backgroundSize="lg" backgroundFade="bottom">
            <Band>
                <Container layout="flex" align="center" justify="between" gap="sm" padding="none" width="100%" wrap={false}>
                    <Container layout="flex" align="center" gap="xs" padding="none" wrap={false}>
                        <Icon name="FiCpu" size="md" color="primary" />
                        <Typography size="md" weight="bold" font="secondary">AI Base</Typography>
                    </Container>
                    <Container layout="flex" align="center" gap="xs" padding="none" wrap={false}>
                        {!user && <Button size="sm" variant="ghost" onClick={() => navigate('/login')}>Sign in</Button>}
                        {user && <Button size="sm" variant="ghost" onClick={() => navigate('/dashboard')}>Dashboard</Button>}
                        <Button size="sm" color="primary" onClick={() => navigate(start)}>{user ? 'Open chat' : 'Get started'}</Button>
                    </Container>
                </Container>
            </Band>

            <Band width="820px">
                <Container layout="flex-column" align="center" gap="sm" padding="none" width="100%" marginTop="lg">
                    <Badge color="secondary" size="sm">Local AI, no command line</Badge>
                    <Typography as="h1" size="3xl" weight="extrabold" font="secondary" animation="blur" animationDuration={700} animationConfig={{ splitBy: 'words' }}>
                        Ask your own computer.
                    </Typography>
                    <Typography size="md" color="muted">Chat with AI models that run on your hardware.</Typography>
                    <Typography size="md" color="muted">They read your files, search the web and draw the answer.</Typography>
                </Container>

                <Card layout="flex-column" gap="sm" padding="md" width="100%" hover={false} borderColor="primary" marginTop="md">
                    <Input
                        multiline
                        rows={2}
                        size="md"
                        variant="underline"
                        backgroundColor="transparent"
                        width="100%"
                        placeholder="Ask anything…"
                        aria-label="Try a first question"
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                    />
                    <Container layout="flex" align="center" justify="between" gap="sm" padding="none" width="100%">
                        <Container layout="flex" gap="xs" padding="none">
                            {DEMOS.map((item) => (
                                <Button key={item.id} size="xs" variant="ghost" selected={demo.id === item.id} onClick={() => choose(item)}>
                                    <Icon name={item.icon} size="xs" />{item.chip}
                                </Button>
                            ))}
                        </Container>
                        <Button size="sm" color="primary" disabled={!prompt.trim()} onClick={send}>
                            {user ? 'Ask in chat' : 'Create an account to ask'}<Icon name="FiArrowRight" size="xs" />
                        </Button>
                    </Container>
                </Card>
                <Typography size="xxs" color="muted">Pick an example to see the kind of answer a model draws. Sending opens it in Chat.</Typography>

                <Card layout="flex-column" gap="sm" padding="md" width="100%" hover={false} backgroundColor="background">
                    <Container layout="flex" align="center" justify="between" gap="sm" padding="none" width="100%" wrap={false}>
                        <Container layout="flex" align="center" gap="xs" padding="none" wrap={false}>
                            <Icon name="FiCpu" size="xs" color="primary" />
                            <Typography size="xs" weight="semibold">What the answer looks like</Typography>
                        </Container>
                        <Badge size="xs" color="success">Drawn by the model</Badge>
                    </Container>
                    <Typography key={demo.id} size="sm" animation="fade" animationDuration={500}>{demo.reply}</Typography>
                    <Container key={`${demo.id}-view`} padding="none" width="100%">{demo.render()}</Container>
                </Card>
            </Band>

            <Band>
                <Container layout="grid" columns="auto" gap="md" padding="none" width="100%" marginTop="lg">
                    {PROOF.map((item) => (
                        <Container key={item.title} layout="flex" align="start" gap="sm" padding="none" wrap={false}>
                            <Icon name={item.icon} size="sm" color="primary" />
                            <Container layout="flex-column" gap="none" padding="none">
                                <Typography size="sm" weight="semibold">{item.title}</Typography>
                                <Typography size="xs" color="muted">{item.text}</Typography>
                            </Container>
                        </Container>
                    ))}
                </Container>
                <Divider margin="sm" />
            </Band>

            <Band>
                <Container layout="flex-column" gap="none" padding="none" width="100%" maxWidth="560px">
                    <Typography as="h2" size="xl" weight="bold" font="secondary">Built for real work, not demos</Typography>
                    <Typography size="sm" color="muted">Everything a local model needs to be useful, in one app you run yourself.</Typography>
                </Container>
                <Container layout="grid" columns={3} gap="sm" padding="none" width="100%">
                    {BENTO.map((item) => (
                        <Card key={item.title} layout="flex-column" gap="xs" padding="md" span={item.span || null} minWidth="0" shadow={false} wrap={false} background={item.span ? 'dots' : null} backgroundFade="left">
                            <Icon name={item.icon} size="sm" color="primary" />
                            <Typography size="sm" weight="semibold">{item.title}</Typography>
                            <Typography size="xs" color="muted">{item.text}</Typography>
                        </Card>
                    ))}
                </Container>
            </Band>

            <Band>
                <Container layout="grid" columns="auto" gap="md" padding="none" width="100%" marginTop="lg">
                    {STEPS.map(([title, text], index) => (
                        <Container key={title} layout="flex" align="start" gap="sm" padding="none" wrap={false}>
                            <Typography size="2xl" weight="bold" color="primary" font="monospace">{index + 1}</Typography>
                            <Container layout="flex-column" gap="none" padding="none">
                                <Typography size="sm" weight="semibold">{title}</Typography>
                                <Typography size="xs" color="muted">{text}</Typography>
                            </Container>
                        </Container>
                    ))}
                </Container>
                <Divider margin="sm" />
                <Container layout="flex" align="center" justify="between" gap="md" padding="none" width="100%">
                    <Typography size="xs" color="muted">AI Base. Local AI that stays on the machine it runs on.</Typography>
                    <Button size="sm" color="primary" onClick={() => navigate(start)}>
                        {user ? 'Open chat' : 'Get started'}<Icon name="FiArrowRight" size="xs" />
                    </Button>
                </Container>
            </Band>
        </Page>
    );
};

export default HomePage;
