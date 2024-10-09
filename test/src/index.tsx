import React, { useState, useEffect } from "react";
import { b, c } from "@/utils/b"
import { a } from "@/utils/a"
import Tag from "@/components/tag"

const getSome = () => {
    return a() + b()
}

const Test = () => {

    useEffect(() => {
        getSome();
        init();
        c();
    }, [])
    
    const init = () => {
        console.log('init')
    }

    const RenderText = () => {
        return 'test'
    }

    return (
        <div>
            test
            <Tag />
            <RenderText />
        </div>
    )
}


class TestClass extends React.Component {

    componentDidMount(): void {
        getSome();
        this.init();
        c();
    }

    init() {
        console.log('init')
    }
    render() {

        const RenderText = () => {
            return 'test'
        }

        return (
            <div>
                test
                <Tag />
                <RenderText />
            </div>
        )
    }
}

function TestFunction() {
    
    useEffect(() => {
        getSome();
        init();
        c();
    }, [])

    const init = () => {
        console.log('init')
    }

    const RenderText = () => {
        return 'test'
    }

    return (
        <div>
            test
            <Tag />
            <RenderText />
        </div>
    )
}

export default TestFunction